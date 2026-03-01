import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StudyGuideArtifact } from '@/components/exam-prep/types';
import type { ThemeColors } from '@/contexts/ThemeContext';

interface ExamStudyGuideViewProps {
  artifact: StudyGuideArtifact;
  theme: ThemeColors;
}

export function ExamStudyGuideView({ artifact, theme }: ExamStudyGuideViewProps): React.ReactElement {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{artifact.title || 'Study Guide'}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Follow this day-by-day plan before assessment day.
        </Text>
      </View>

      {(artifact.days || []).map((day, dayIndex) => (
        <View
          key={`${day.day}-${dayIndex}`}
          style={[styles.dayCard, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={[styles.dayLabel, { color: theme.primary }]}>{day.day || `Day ${dayIndex + 1}`}</Text>
          <Text style={[styles.focusText, { color: theme.text }]}>{day.focus}</Text>
          {(day.tasks || []).map((task, taskIndex) => (
            <Text key={`${task}-${taskIndex}`} style={[styles.taskText, { color: theme.muted }]}>
              • {task}
            </Text>
          ))}
        </View>
      ))}

      {(artifact.checklist || []).length > 0 ? (
        <View style={[styles.dayCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.dayLabel, { color: theme.text }]}>Final Checklist</Text>
          {(artifact.checklist || []).map((item, index) => (
            <Text key={`${item}-${index}`} style={[styles.taskText, { color: theme.muted }]}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}
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
  dayCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  focusText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
});
