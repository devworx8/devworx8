/**
 * MissionControlSection — Action grid with grouped sub-sections
 * 
 * Renders the "Mission Control 🚀" section content: grouped quick
 * actions organized by Missions, Comms, Billing, and Dash Intelligence.
 * 
 * ≤150 lines — WARP-compliant presentational component.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { MetricCard } from '../shared';

export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  disabled?: boolean;
  subtitle?: string;
  glow?: boolean;
}

export interface ActionSection {
  id: string;
  title: string;
  icon: string;
}

interface MissionControlSectionProps {
  sections: ActionSection[];
  groupedActions: Record<string, QuickAction[]>;
  onAction: (actionId: string) => void;
  onUpgrade: () => void;
}

export const MissionControlSection: React.FC<MissionControlSectionProps> = ({
  sections,
  groupedActions,
  onAction,
  onUpgrade,
}) => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < 380;
  const gridGap = isSmallScreen ? 6 : 8;
  const [gridWidth, setGridWidth] = useState(0);

  const cardWidth = useMemo(() => {
    const fallbackWidth = Math.max(windowWidth - 32, 240);
    const effectiveGridWidth = gridWidth > 0 ? gridWidth : fallbackWidth;
    return Math.max(88, Math.floor((effectiveGridWidth - gridGap * 2) / 3));
  }, [gridGap, gridWidth, windowWidth]);

  return (
    <>
      {sections.map((section) => {
        const actions = groupedActions[section.id] || [];
        if (actions.length === 0) return null;

        return (
          <View key={section.id} style={styles.actionSection}>
            <View style={styles.actionSectionHeader}>
              <View
                style={[
                  styles.actionSectionIcon,
                  {
                    backgroundColor: theme.surfaceVariant,
                    borderColor: theme.borderLight,
                  },
                ]}
              >
                <Ionicons name={section.icon as any} size={14} color={theme.textSecondary} />
              </View>
              <Text style={[styles.actionSectionTitle, { color: theme.textSecondary }]}>
                {section.title}
              </Text>
            </View>
            <View
              style={[styles.actionsGrid, { gap: gridGap }]}
              onLayout={(event) => {
                const nextWidth = Math.floor(event.nativeEvent.layout.width);
                if (nextWidth > 0 && nextWidth !== gridWidth) {
                  setGridWidth(nextWidth);
                }
              }}
            >
              {actions.map((action) => (
                <View
                  key={action.id}
                  style={[
                    styles.gridItem,
                    { flexBasis: cardWidth, maxWidth: cardWidth },
                    action.disabled ? styles.disabledItem : undefined,
                  ]}
                >
                  <MetricCard
                    title={action.disabled ? `${action.title} 🔒` : action.title}
                    subtitle={action.subtitle}
                    value=""
                    icon={action.icon}
                    color={action.disabled ? theme.textSecondary : action.color}
                    size="small"
                    cardWidth={cardWidth}
                    glow={Boolean(action.glow)}
                    onPress={() => {
                      if (action.disabled) {
                        onUpgrade();
                      } else {
                        onAction(action.id);
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  actionSection: { marginBottom: 16 },
  actionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionSectionIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  gridItem: {
    flexGrow: 0,
    flexShrink: 0,
  },
  disabledItem: { opacity: 0.5 },
});

export default MissionControlSection;
