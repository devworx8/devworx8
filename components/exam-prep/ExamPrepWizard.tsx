/**
 * Exam Prep Wizard (React Native)
 *
 * Feature component kept outside route file so screens remain thin per WARP.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ExamPrepReviewStep } from '@/components/exam-prep/ExamPrepWizardReviewStep';
import {
  ExamPrepGradeStep,
  ExamPrepSubjectStep,
  ExamPrepTypeStep,
} from '@/components/exam-prep/ExamPrepWizardSteps';
import {
  GRADES,
  SUBJECTS_BY_PHASE,
  getPhaseFromGrade,
  type ExamContextSummary,
  type ExamGenerationResponse,
  type SouthAfricanLanguage,
} from '@/components/exam-prep/types';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { hasCapability, getRequiredTier, type Tier } from '@/lib/ai/capabilities';
import { getCapabilityTier, normalizeTierName } from '@/lib/tiers';
import { assertSupabase } from '@/lib/supabase';
import { stashExamGenerationDraft } from '@/lib/exam-prep/generationDraftStore';
import {
  buildExamGenerationHref,
  buildExamRouteParams,
  getSubjectCategory,
  toSafeParam,
  type SubjectCategory,
  type WizardStep,
} from '@/components/exam-prep/examPrepWizard.helpers';
import { examPrepWizardStyles as styles } from '@/components/exam-prep/examPrepWizard.styles';

const MAX_MATERIAL_SIZE_BYTES = 8 * 1024 * 1024;

type StudyMaterial = {
  id: string;
  name: string;
  mimeType: string;
  summary?: string;
  status: 'processing' | 'ready' | 'error';
  error?: string;
};

export function ExamPrepWizard(): React.ReactElement {
  const { theme, isDark } = useTheme();
  const { tier } = useSubscription();
  const params = useLocalSearchParams<{
    grade?: string;
    childName?: string;
    studentId?: string;
    classId?: string;
    schoolId?: string;
  }>();

  const gradeParam = toSafeParam(params.grade);
  const childName = toSafeParam(params.childName);
  const studentId = toSafeParam(params.studentId);
  const classId = toSafeParam(params.classId);
  const schoolId = toSafeParam(params.schoolId);

  const hasPrefilledGrade = !!(gradeParam && GRADES.some((grade) => grade.value === gradeParam));

  const [selectedGrade, setSelectedGrade] = useState<string>(hasPrefilledGrade ? gradeParam! : 'grade_4');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<string>('practice_test');
  const [selectedLanguage, setSelectedLanguage] = useState<SouthAfricanLanguage>('en-ZA');
  const [step, setStep] = useState<WizardStep>(hasPrefilledGrade ? 'subject' : 'grade');

  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>('all');

  const [useTeacherContext, setUseTeacherContext] = useState(true);
  const [contextPreview, setContextPreview] = useState<ExamContextSummary | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [customPromptText, setCustomPromptText] = useState('');
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const contextRequestSeqRef = useRef(0);

  const phase = getPhaseFromGrade(selectedGrade);
  const subjects = SUBJECTS_BY_PHASE[phase] || [];
  const gradeInfo = GRADES.find((grade) => grade.value === selectedGrade);
  const tierForCaps: Tier = getCapabilityTier(normalizeTierName(tier || 'free'));
  const canUseExamPrep = hasCapability(tierForCaps, 'exam.practice');
  const requiredExamTier = getRequiredTier('exam.practice');

  const selectedExamTypeLabel = useMemo(() => {
    const examType = selectedExamType === 'practice_test'
      ? 'Practice Test'
      : selectedExamType === 'revision_notes'
        ? 'Revision Notes'
        : selectedExamType === 'study_guide'
          ? 'Study Guide'
          : selectedExamType === 'flashcards'
            ? 'Flashcards'
            : selectedExamType;
    return examType;
  }, [selectedExamType]);

  const quickLaunchLabel = `${gradeInfo?.label || 'Selected Grade'} • ${selectedSubject || 'Afrikaans First Additional Language'}`;

  const filteredSubjects = useMemo(() => {
    const search = subjectSearch.trim().toLowerCase();

    return subjects.filter((subject) => {
      const category = getSubjectCategory(subject);
      const categoryMatches = subjectCategory === 'all' || category === subjectCategory;
      const searchMatches = !search || subject.toLowerCase().includes(search);
      return categoryMatches && searchMatches;
    });
  }, [subjects, subjectSearch, subjectCategory]);

  const hasMaterialProcessing = useMemo(
    () => studyMaterials.some((material) => material.status === 'processing'),
    [studyMaterials],
  );

  const readyMaterialSummaries = useMemo(
    () =>
      studyMaterials
        .filter((material) => material.status === 'ready' && material.summary)
        .map((material) => `Source: ${material.name}\n${material.summary}`),
    [studyMaterials],
  );

  const buildCustomPrompt = useCallback((): string | undefined => {
    const blocks: string[] = [];
    const trimmedPrompt = customPromptText.trim();
    if (trimmedPrompt) {
      blocks.push(`Additional learner requirements:\n${trimmedPrompt}`);
    }
    if (readyMaterialSummaries.length > 0) {
      blocks.push(
        `Study material extracted from uploaded images/PDFs:\n${readyMaterialSummaries.join('\n\n---\n\n')}`
      );
      blocks.push(
        'When generated content includes non-English terminology, include plain English support cues for the learner.'
      );
    }

    if (blocks.length === 0) return undefined;
    return blocks.join('\n\n');
  }, [customPromptText, readyMaterialSummaries]);

  const updateStudyMaterial = useCallback((id: string, patch: Partial<StudyMaterial>) => {
    setStudyMaterials((prev) =>
      prev.map((material) => (material.id === id ? { ...material, ...patch } : material))
    );
  }, []);

  const summarizeStudyMaterial = useCallback(
    async (payload: { base64: string; mimeType: string; fileName: string }): Promise<string> => {
      const supabase = assertSupabase();
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          scope: 'student',
          service_type: 'image_analysis',
          payload: {
            prompt: `Extract exam-prep context from ${payload.fileName}. Provide concise bullet points under: (1) Topics to revise, (2) Key facts/formulas, (3) Common mistakes, (4) Suggested question angles. If the source language is not English, include short English translations for critical terms.`,
            context:
              'You process learner study material for CAPS exam prep. Return plain text bullet points only. Keep it concise and practical.',
            images: [{ data: payload.base64, media_type: payload.mimeType }],
            ocr_mode: true,
            ocr_task: 'document',
            ocr_response_format: 'text',
          },
          stream: false,
          enable_tools: false,
          metadata: {
            source: 'exam_prep.wizard.material_ocr',
            file_name: payload.fileName,
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze study material.');
      }

      const summary =
        typeof data === 'string'
          ? data.trim()
          : String(data?.content || data?.ocr?.analysis || '').trim();

      if (!summary) {
        throw new Error('No readable content detected in the selected file.');
      }

      return summary;
    },
    [],
  );

  const processStudyMaterial = useCallback(
    async (file: { uri: string; name: string; mimeType: string; size?: number }) => {
      const safeName = file.name || `material-${Date.now()}`;
      const materialId = `material_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const info = await FileSystem.getInfoAsync(file.uri);
      const sizeBytes =
        typeof file.size === 'number' && file.size > 0
          ? file.size
          : info.exists && typeof info.size === 'number'
          ? info.size
          : 0;

      if (sizeBytes > MAX_MATERIAL_SIZE_BYTES) {
        Alert.alert(
          'File too large',
          'Please use files up to 8MB for exam material analysis.',
        );
        return;
      }

      setStudyMaterials((prev) => [
        ...prev,
        {
          id: materialId,
          name: safeName,
          mimeType: file.mimeType,
          status: 'processing',
        },
      ]);

      try {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const summary = await summarizeStudyMaterial({
          base64,
          mimeType: file.mimeType,
          fileName: safeName,
        });
        updateStudyMaterial(materialId, {
          status: 'ready',
          summary,
          error: undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not process this study file.';
        updateStudyMaterial(materialId, {
          status: 'error',
          error: message,
        });
      }
    },
    [summarizeStudyMaterial, updateStudyMaterial],
  );

  const handlePickMaterialImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access to upload study material.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      await processStudyMaterial({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      });
    } catch {
      Alert.alert('Upload failed', 'Could not add image study material. Please try again.');
    }
  }, [processStudyMaterial]);

  const handlePickMaterialPdf = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      await processStudyMaterial({
        uri: asset.uri,
        name: asset.name || `document-${Date.now()}.pdf`,
        mimeType: asset.mimeType || 'application/pdf',
        size: asset.size,
      });
    } catch {
      Alert.alert('Upload failed', 'Could not add PDF study material. Please try again.');
    }
  }, [processStudyMaterial]);

  const handleRemoveMaterial = useCallback((materialId: string) => {
    setStudyMaterials((prev) => prev.filter((material) => material.id !== materialId));
  }, []);

  const fetchContextPreview = useCallback(async () => {
    if (!selectedGrade || !selectedSubject || !selectedExamType || !useTeacherContext) {
      setContextPreview(null);
      setContextError(null);
      return;
    }

    const requestSeq = ++contextRequestSeqRef.current;
    setContextLoading(true);
    setContextError(null);

    try {
      const supabase = assertSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const invokeOptions: {
        body: Record<string, unknown>;
        headers?: Record<string, string>;
      } = {
        body: {
          grade: selectedGrade,
          subject: selectedSubject,
          examType: selectedExamType,
          language: selectedLanguage,
          studentId,
          classId,
          schoolId,
          useTeacherContext: true,
          previewContext: true,
        },
      };

      if (token) {
        invokeOptions.headers = { Authorization: `Bearer ${token}` };
      }

      const { data, error } = await supabase.functions.invoke('generate-exam', invokeOptions);
      if (error) {
        throw new Error(error.message || 'Could not load teacher context');
      }

      const response = data as ExamGenerationResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Could not load teacher context');
      }

      if (requestSeq !== contextRequestSeqRef.current) return;
      setContextPreview(
        response.contextSummary || {
          assignmentCount: 0,
          lessonCount: 0,
          focusTopics: [],
          weakTopics: [],
        }
      );
    } catch (error) {
      if (requestSeq !== contextRequestSeqRef.current) return;
      const message = error instanceof Error ? error.message : 'Could not load teacher context';
      setContextError(message);
      setContextPreview(null);
    } finally {
      if (requestSeq !== contextRequestSeqRef.current) return;
      setContextLoading(false);
    }
  }, [
    selectedGrade,
    selectedSubject,
    selectedExamType,
    selectedLanguage,
    studentId,
    classId,
    schoolId,
    useTeacherContext,
  ]);

  useEffect(() => {
    if (step !== 'review') return;

    if (!useTeacherContext) {
      setContextPreview(null);
      setContextError(null);
      setContextLoading(false);
      return;
    }

    fetchContextPreview();
  }, [step, useTeacherContext, fetchContextPreview]);

  const moveToStep = useCallback((nextStep: WizardStep) => {
    setStep(nextStep);
  }, []);

  const handleSelectGrade = useCallback((grade: string) => {
    setSelectedGrade(grade);
    setSelectedSubject('');
    setSubjectSearch('');
    setSubjectCategory('all');
  }, []);

  const handleStartGeneration = useCallback(
    (withTeacherContext: boolean) => {
      if (!selectedGrade || !selectedSubject || !selectedExamType) return;
      if (hasMaterialProcessing) {
        Alert.alert(
          'Please wait',
          'We are still extracting content from your uploaded study material.',
        );
        return;
      }

      const customPrompt = buildCustomPrompt();
      const draftId = customPrompt
        ? stashExamGenerationDraft({
            customPrompt,
          })
        : undefined;

      const generationParams = buildExamRouteParams({
        grade: selectedGrade,
        subject: selectedSubject,
        examType: selectedExamType,
        language: selectedLanguage,
        useTeacherContext: withTeacherContext,
        draftId,
        contextIds: {
          childName,
          studentId,
          classId,
          schoolId,
        },
      });

      router.push(buildExamGenerationHref(generationParams));
    },
    [
      selectedGrade,
      selectedSubject,
      selectedExamType,
      selectedLanguage,
      hasMaterialProcessing,
      buildCustomPrompt,
      childName,
      studentId,
      classId,
      schoolId,
    ]
  );

  const handleQuickStartAfrikaansLive = useCallback(() => {
    const quickGrade = selectedGrade || gradeParam || 'grade_6';
    const quickParams = buildExamRouteParams({
      grade: quickGrade,
      subject: selectedSubject || 'Afrikaans First Additional Language',
      examType: 'practice_test',
      language: selectedLanguage || 'af-ZA',
      useTeacherContext: true,
      contextIds: {
        childName,
        studentId,
        classId,
        schoolId,
      },
    });

    router.push(buildExamGenerationHref(quickParams));
  }, [selectedGrade, gradeParam, selectedSubject, selectedLanguage, childName, studentId, classId, schoolId]);

  if (!canUseExamPrep) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Exam Prep' }} />
        <View style={styles.disabledContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.muted} />
          <Text style={[styles.disabledText, { color: theme.text }]}>Exam Prep is locked</Text>
          <Text style={[styles.disabledSubtext, { color: theme.muted }]}>Upgrade to {requiredExamTier || 'Starter'} to unlock exam practice features.</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/screens/manage-subscription')}>
            <Text style={styles.backButtonText}>Manage Plan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = step === 'grade' ? 1 : step === 'subject' ? 2 : step === 'type' ? 3 : 4;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Exam Prep',
          headerRight: () => (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>CAPS</Text>
            </View>
          ),
        }}
      />

      <LinearGradient colors={isDark ? ['#1e293b', '#0f172a'] : ['#f0f9ff', '#e0f2fe']} style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="school" size={32} color={theme.primary} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>AI-Powered Exam Prep</Text>
            <Text style={[styles.headerSubtitle, { color: theme.muted }]}>Structured CAPS-aligned generation from real teacher artifacts.</Text>
          </View>
        </View>

        <View style={styles.progressSteps}>
          {['Grade', 'Subject', 'Type', 'Review'].map((label, index) => {
            const stepNum = index + 1;
            const isActive = stepNum <= currentStep;
            return (
              <View key={label} style={styles.progressStep}>
                <View style={[styles.progressDot, { backgroundColor: isActive ? theme.primary : theme.border }]}>
                  {stepNum < currentStep ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : null}
                </View>
                <Text style={[styles.progressLabel, { color: isActive ? theme.primary : theme.muted }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <View style={[styles.quickLaunchCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <View style={styles.quickLaunchHeader}>
            <Ionicons name="flash-outline" size={18} color={theme.primary} />
            <Text style={[styles.quickLaunchTitle, { color: theme.text }]}>Quick Live Session</Text>
          </View>
          <Text style={[styles.quickLaunchSubtitle, { color: theme.muted }]}>Open interactive in-canvas practice for {quickLaunchLabel} with instant correct/incorrect markers and explanations.</Text>
          <TouchableOpacity style={[styles.quickLaunchButton, { backgroundColor: theme.primary }]} onPress={handleQuickStartAfrikaansLive}>
            <Ionicons name="play-circle" size={18} color="#ffffff" />
            <Text style={styles.quickLaunchButtonText}>Start Live Practice: {quickLaunchLabel}</Text>
          </TouchableOpacity>
        </View>

        {step === 'grade' ? (
          <ExamPrepGradeStep
            theme={theme}
            selectedGrade={selectedGrade}
            onSelectGrade={handleSelectGrade}
            onNext={() => moveToStep('subject')}
          />
        ) : null}

        {step === 'subject' ? (
          <ExamPrepSubjectStep
            theme={theme}
            gradeLabel={gradeInfo?.label || selectedGrade}
            selectedSubject={selectedSubject}
            filteredSubjects={filteredSubjects}
            subjectSearch={subjectSearch}
            subjectCategory={subjectCategory}
            onSubjectSearchChange={setSubjectSearch}
            onSubjectCategoryChange={setSubjectCategory}
            onSelectSubject={setSelectedSubject}
            onBack={() => moveToStep('grade')}
            onNext={() => moveToStep('type')}
          />
        ) : null}

        {step === 'type' ? (
          <ExamPrepTypeStep
            theme={theme}
            gradeLabel={gradeInfo?.label || selectedGrade}
            selectedSubject={selectedSubject}
            selectedExamType={selectedExamType}
            selectedLanguage={selectedLanguage}
            onSelectExamType={setSelectedExamType}
            onSelectLanguage={setSelectedLanguage}
            onBack={() => moveToStep('subject')}
            onNext={() => moveToStep('review')}
          />
        ) : null}

        {step === 'review' ? (
          <>
            <ExamPrepReviewStep
              theme={theme}
              childName={childName}
              gradeLabel={gradeInfo?.label || selectedGrade}
              selectedGrade={selectedGrade}
              selectedSubject={selectedSubject}
              selectedExamTypeLabel={selectedExamTypeLabel}
              selectedExamType={selectedExamType}
              selectedLanguage={selectedLanguage}
              generateButtonLabel={`Generate ${selectedExamTypeLabel}`}
              useTeacherContext={useTeacherContext}
              contextPreview={contextPreview}
              contextLoading={contextLoading}
              contextError={contextError}
              onBack={() => moveToStep('type')}
              onSetUseTeacherContext={setUseTeacherContext}
              onGenerateWithCurrentContext={() => handleStartGeneration(useTeacherContext)}
              onGenerateCapsOnly={() => handleStartGeneration(false)}
            />

            <View style={[styles.materialCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.materialHeader}>
                <Ionicons name="attach-outline" size={16} color={theme.primary} />
                <Text style={[styles.materialTitle, { color: theme.text }]}>Study Material (Optional)</Text>
              </View>
              <Text style={[styles.materialSubtitle, { color: theme.muted }]}>
                Upload an image or PDF of homework/classwork so exam questions align with the learner&apos;s material.
              </Text>

              <View style={styles.materialActions}>
                <TouchableOpacity
                  style={[styles.materialActionBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
                  onPress={handlePickMaterialImage}
                >
                  <Ionicons name="image-outline" size={14} color={theme.primary} />
                  <Text style={[styles.materialActionText, { color: theme.text }]}>Add Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.materialActionBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
                  onPress={handlePickMaterialPdf}
                >
                  <Ionicons name="document-text-outline" size={14} color={theme.primary} />
                  <Text style={[styles.materialActionText, { color: theme.text }]}>Add PDF</Text>
                </TouchableOpacity>
              </View>

              {studyMaterials.map((material) => (
                <View
                  key={material.id}
                  style={[styles.materialItem, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  <View style={styles.materialMeta}>
                    <Text style={[styles.materialName, { color: theme.text }]} numberOfLines={1}>
                      {material.name}
                    </Text>
                    <Text style={[styles.materialStatus, { color: theme.muted }]}>
                      {material.status === 'processing'
                        ? 'Extracting study notes...'
                        : material.status === 'ready'
                        ? 'Ready for generation'
                        : material.error || 'Could not read file'}
                    </Text>
                  </View>
                  <View style={styles.materialRight}>
                    {material.status === 'processing' ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : null}
                    <TouchableOpacity onPress={() => handleRemoveMaterial(material.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={18} color={theme.muted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TextInput
                style={[
                  styles.customPromptInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Add extra instructions (for example: focus on fractions and word problems)."
                placeholderTextColor={theme.muted}
                value={customPromptText}
                onChangeText={setCustomPromptText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
