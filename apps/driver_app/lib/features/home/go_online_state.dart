class GoOnlineUiState {
  const GoOnlineUiState({
    this.busy = false,
    this.onlineSessionStartedAt,
    this.lastPrecheckReasons = const [],
  });

  final bool busy;
  final DateTime? onlineSessionStartedAt;
  final List<String> lastPrecheckReasons;

  GoOnlineUiState copyWith({
    bool? busy,
    DateTime? onlineSessionStartedAt,
    List<String>? lastPrecheckReasons,
    bool clearSession = false,
    bool clearReasons = false,
  }) {
    return GoOnlineUiState(
      busy: busy ?? this.busy,
      onlineSessionStartedAt:
          clearSession ? null : (onlineSessionStartedAt ?? this.onlineSessionStartedAt),
      lastPrecheckReasons: clearReasons
          ? const []
          : (lastPrecheckReasons ?? this.lastPrecheckReasons),
    );
  }
}
