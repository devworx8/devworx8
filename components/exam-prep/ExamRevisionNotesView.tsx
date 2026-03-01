import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RevisionNotesArtifact } from '@/components/exam-prep/types';
import type { ThemeColors } from '@/contexts/ThemeContext';

interface ExamRevisionNotesViewProps {
  artifact: RevisionNotesArtifact;
  theme: ThemeColors;
}

export function ExamRevisionNotesView({
  artifact,
  theme,
}: ExamRevisionNotesViewProps): React.ReactElement {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{artifact.title || 'Revision Notes'}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Key summaries generated from this exam context.
        </Text>
      </View>

      {artifact.keyPoints?.length ? (
        <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Key Points</Text>
          {artifact.keyPoints.map((point, index) => (
            <Text key={`${point}-${index}`} style={[styles.bullet, { color: theme.text }]}>
              • {point}
            </Text>
          ))}
        </View>
      ) : null}

      {(artifact.sections || []).map((section, sectionIndex) => (
        <View
          key={`${section.title}-${sectionIndex}`}
          style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {section.title || `Topic ${sectionIndex + 1}`}
          </Text>
          {(section.bullets || []).map((item, index) => (
            <Text key={`${item}-${index}`} style={[styles.bullet, { color: theme.muted }]}>
              • {item}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    gap: 12,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
});
