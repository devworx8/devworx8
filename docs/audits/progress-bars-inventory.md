# Progress Bars Inventory

Baseline of known dynamic `width: \`${...}%\`` entries that have been reviewed
and deemed safe (bounded by data constraints or component logic).

| File | Line | Notes |
|------|------|-------|
| `components/ai/FeatureQuotaBar.tsx` | 113 | Percent derived from clamped quota values |
| `components/super-admin/ai-quotas/SchoolQuotaCard.tsx` | 68 | Uses Math.min(usagePercentage, 100) |
| `components/super-admin/ai-quotas/SchoolQuotaCard.tsx` | 78 | Uses Math.min(..., 100) |
| `components/ai/dash-assistant/DashHeader.tsx` | 115 | Uses Math.min(100, ...) |
| `components/ai/dash-assistant/DashUsageBanner.tsx` | 86 | Uses Math.min(tierStatus.quotaPercentage, 100) |
| `components/reports/ProgressChart.tsx` | 56 | Percentage from 0-100 bounded data |
| `components/ai-lesson-generator/GenerationProgress.tsx` | 117 | displayProgress is 0-100 bounded |
| `components/ai-lesson-generator/QuotaBar.tsx` | 104 | percentage is 0-100 bounded |
| `components/cv-builder/CVPreviewEnhanced.tsx` | 347 | getProficiencyPercent returns 0-100 |
| `components/gamification/StudentStatsCard.tsx` | 206 | progress is 0-1 fraction * 100 |
| `components/pdf/GenerationProgress.tsx` | 288 | progress.percentage is 0-100 bounded |
| `components/progress-report/ReportProgressIndicator.tsx` | 39 | percentage is 0-100 bounded |
| `components/learner/ProgramProgressCard.tsx` | 44 | progress is 0-100 bounded |
| `components/learner/CourseVideoPlayer.tsx` | 290 | progress is 0-100 bounded |
| `components/lessons/MatchingActivity.tsx` | 127 | Ratio of matched/total * 100 is 0-100 |
| `app/screens/membership/performance.tsx` | 149 | overallScore is 0-100 bounded |
| `app/screens/membership/performance.tsx` | 191 | Uses Math.min(progress, 100) |
| `app/screens/membership/performance.tsx` | 236 | region.score is 0-100 bounded |
| `app/screens/membership/reports.tsx` | 105 | utilizationRate is 0-100 percentage |
| `app/screens/membership/analytics.tsx` | 201 | item.percentage is 0-100 bounded |
| `app/screens/membership/finance.tsx` | 248 | percentage is 0-100 bounded |
| `app/screens/membership/strategy.tsx` | 197 | Uses Math.min(progress, 100) |
| `app/screens/membership/strategy.tsx` | 262 | initiative.progress is 0-100 bounded |
| `components/dashboard/EnhancedChildrenGrid.tsx` | 314 | progressScore is 0-100 bounded |
| `components/dashboard/teacher/TeacherDashboardComponents.tsx` | 361 | Ratio of submitted/total * 100 |
| `components/dashboard/parent/MetricCard.tsx` | 169 | Uses Math.min(progress, 100) |
| `components/dashboard/principal/PrincipalMetricComponents.tsx` | 142 | Uses Math.min(Math.max(..., 0), 1) * 100 |
| `components/dashboard/EnhancedStats.tsx` | 38 | percentage is 0-100 bounded |
| `components/assignments/AssignmentProgressTracker.tsx` | 43 | completedPercent is 0-100 bounded |
| `components/assignments/AssignmentProgressTracker.tsx` | 49 | inProgressPercent is 0-100 bounded |
| `components/assignments/AssignmentProgressTracker.tsx` | 55 | notStartedPercent is 0-100 bounded |
| `components/quiz/QuizMode.tsx` | 373 | Progress fill bounded by question count |
| `components/learning-hub/LearningHubActivityModal.tsx` | 68 | Bounded percentage |
| `components/auth/PasswordRecovery.tsx` | 397 | Progress indicator 0-100 |
| `components/auth/TwoFactorAuth.tsx` | 607 | Progress indicator 0-100 |
| `app/screens/grades.tsx` | 136 | Grade percentage bounded |
| `components/activities/ActivityPlayer.tsx` | 265 | Progress 0-1 fraction * 100 |
| `components/activities/preschool/CountingGame.tsx` | 225 | Ratio bounded 0-100 |
| `app/screens/learning-hub.tsx` | 174 | Usage fill bounded |
| `app/screens/learning-hub.tsx` | 182 | Usage fill bounded |
| `app/screens/learning-hub.tsx` | 190 | Usage fill bounded |
| `components/ai-settings/VoiceSection.tsx` | 273 | Bounded percentage |
| `app/screens/budget-management.tsx` | 188 | Progress fill bounded |
| `components/hiring/ApplicationVettingPanel.tsx` | 47 | Score bar bounded |
| `app/screens/learner/programs.tsx` | 73 | Progress bounded |
| `app/screens/lesson-detail.tsx` | 368 | Progress bounded |
| `app/screens/super-admin-system-monitoring.tsx` | 376 | System metric bounded |
| `app/screens/super-admin-system-monitoring.tsx` | 385 | CPU usage bounded |
| `app/screens/super-admin-system-monitoring.tsx` | 396 | Disk usage bounded |
| `components/ui/AIQuotaDisplay.tsx` | 66 | Quota bar bounded |
| `components/ui/ProgressBar.tsx` | 57 | Generic progress bar component |
| `app/screens/org-admin/cv-upload.tsx` | 292 | Upload progress 0-100 |
| `components/ui/QuotaUsageAnalytics.tsx` | 88 | Progress bar bounded |
| `app/screens/membership/register.tsx` | 691 | Registration progress bounded |
| `app/screens/membership/events.tsx` | 342 | Uses Math.min for attendance ratio |
| `components/dashboard/cards/CertificationsCard.tsx` | 59 | Progress bounded |
| `app/screens/parent-document-upload.tsx` | 49 | Document upload ratio bounded |
| `app/screens/parent-document-upload.tsx` | 138 | Upload progress 0-100 |
| `app/screens/super-admin-analytics.tsx` | 314 | Plan percentage bounded |
| `app/screens/principal-analytics.tsx` | 212 | Enrollment ratio bounded |
| `components/finance/FinanceOverviewTab.tsx` | 72 | Uses Math.min(collectionRate, 100) |
