import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FlashcardsArtifact } from '@/components/exam-prep/types';
import type { ThemeColors } from '@/contexts/ThemeContext';

interface ExamFlashcardsViewProps {
  artifact: FlashcardsArtifact;
  theme: ThemeColors;
}

export function ExamFlashcardsView({ artifact, theme }: ExamFlashcardsViewProps): React.ReactElement {
  const cards = artifact.cards || [];
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const current = cards[index];
  const progressLabel = useMemo(() => {
    if (cards.length === 0) return '0 / 0';
    return `${index + 1} / ${cards.length}`;
  }, [cards.length, index]);

  const goNext = () => {
    if (cards.length === 0) return;
    setShowBack(false);
    setIndex((prev) => (prev + 1) % cards.length);
  };

  const goPrev = () => {
    if (cards.length === 0) return;
    setShowBack(false);
    setIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  if (!current) {
    return (
      <View style={[styles.emptyWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.emptyText, { color: theme.muted }]}>No flashcards available for this set.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{artifact.title || 'Flashcards'}</Text>
        <Text style={[styles.progress, { color: theme.muted }]}>{progressLabel}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={() => setShowBack((prev) => !prev)}
      >
        <View style={[styles.badge, { backgroundColor: `${theme.primary}22` }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>{showBack ? 'Back' : 'Front'}</Text>
        </View>
        <Text style={[styles.cardText, { color: theme.text }]}>
          {showBack ? current.back : current.front}
        </Text>
        {showBack && current.hint ? (
          <Text style={[styles.hint, { color: theme.muted }]}>{current.hint}</Text>
        ) : null}
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.button, { borderColor: theme.border }]} onPress={goPrev}>
          <Ionicons name="chevron-back" size={16} color={theme.text} />
          <Text style={[styles.buttonText, { color: theme.text }]}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { borderColor: theme.primary, backgroundColor: `${theme.primary}12` }]}
          onPress={() => setShowBack((prev) => !prev)}
        >
          <Ionicons name="swap-horizontal" size={16} color={theme.primary} />
          <Text style={[styles.buttonText, { color: theme.primary }]}>{showBack ? 'Show front' : 'Show answer'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { borderColor: theme.border }]} onPress={goNext}>
          <Text style={[styles.buttonText, { color: theme.text }]}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  progress: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    minHeight: 240,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    marginHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  emptyText: {
    fontSize: 14,
  },
});
