import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import StatCard from '../widgets/StatCard';

const PlayerDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  coaches = [],
  players = [],
  apiClient,
  onRefresh,
  activeTab: parentActiveTab,
}) => {
  const matches = data.matches_played ?? 0;
  const wins = data.matches_won ?? 0;
  const losses = data.matches_lost ?? 0;
  const teams = data.team_names ?? [];

  // Tab States
  const [localTab, setLocalTab] = useState('Overview'); // 'Overview', 'Statistics', 'Matches'
  const activeTab = parentActiveTab || localTab;
  const setActiveTab = setLocalTab;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    const tabs = ['Overview', 'Statistics', 'Matches'];
    const prevIndex = tabs.indexOf(prevTabRef.current);
    const currIndex = tabs.indexOf(activeTab);
    prevTabRef.current = activeTab;

    if (prevIndex !== -1 && currIndex !== -1 && prevIndex !== currIndex) {
      const slideStart = currIndex > prevIndex ? 100 : -100;
      slideAnim.setValue(slideStart);
      fadeAnim.setValue(0.3);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(1);
    }
  }, [activeTab]);

  // Team Registration Form States
  const [selectedTourneyId, setSelectedTourneyId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showTourneys, setShowTourneys] = useState(false);

  // Match Details Modal
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard', 'WagonWheel'
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Animated scaling for spring tap effects
  const squadBtnScale = useRef(new Animated.Value(1)).current;
  // Animated value for oscillating badge
  const badgePulse = useRef(new Animated.Value(1)).current;

  // Stagger values for match list
  const listFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Oscillating badge infinite pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const tabFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    tabFade.setValue(0);
    Animated.timing(tabFade, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Matches') {
      listFade.setValue(0);
      Animated.timing(listFade, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab]);

  const handleSquadPressIn = () => {
    Animated.spring(squadBtnScale, {
      toValue: 0.95,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleSquadPressOut = () => {
    Animated.spring(squadBtnScale, {
      toValue: 1,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  // Filter lists based on search queries
  const filteredCoaches = coachSearch
    ? coaches.filter((c) => c.full_name.toLowerCase().includes(coachSearch.toLowerCase()))
    : coaches;

  const filteredPlayers = playerSearch
    ? players.filter((p) => p.full_name.toLowerCase().includes(playerSearch.toLowerCase()))
    : players;

  // Fetch all matches for player's tournaments
  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const allMatches = [];
      for (const t of tournaments) {
        const url = `${apiClient.constructor.baseUrl}/tournaments/${t.id}/matches`;
        const res = await apiClient.request(url);
        if (Array.isArray(res)) {
          allMatches.push(...res.map(m => ({ ...m, tournamentName: t.name })));
        }
      }
      setMatchesList(allMatches);
    } catch (e) {
      console.log('Error fetching tournament matches:', e);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Matches') {
      fetchMatches();
    }
  }, [activeTab, tournaments]);

  const togglePlayerSelect = (playerId) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== playerId));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleRegisterTeam = async () => {
    if (!selectedTourneyId || !teamName || !selectedCoachId || selectedPlayerIds.length === 0) {
      setError('Please choose a tournament, name, coach, and select players.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.registerTeam(
        parseInt(selectedTourneyId),
        teamName,
        parseInt(selectedCoachId),
        selectedPlayerIds.map((id) => parseInt(id))
      );

      if (res && res.id) {
        setMessage(`Team "${teamName}" registered successfully (pending approval)!`);
        setTeamName('');
        setSelectedTourneyId('');
        setCoachSearch('');
        setSelectedCoachId('');
        setPlayerSearch('');
        setSelectedPlayerIds([]);
        if (onRefresh) onRefresh();
      } else {
        setError(res?.detail || 'Failed to register team.');
      }
    } catch (e) {
      setError(e?.message || 'Failed to connect to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedTourneyLabel = () => {
    const tourney = tournaments.find((t) => t.id.toString() === selectedTourneyId);
    return tourney ? tourney.name : 'Select Tournament';
  };

  const getCoachNameById = (id) => {
    const coach = coaches.find((c) => c.id === id);
    return coach ? coach.full_name : 'No coach assigned';
  };

  return (
    <View style={styles.container}>
      {/* Sub-header Tabs */}
      {!parentActiveTab && (
        <View style={styles.tabBar}>
          {['Overview', 'Statistics', 'Matches'].map((tab) => (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.8}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
        <ScrollView nestedScrollEnabled={true} style={styles.scrollContainer}>
          {activeTab === 'Overview' && (
          <View>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <StatCard label="Played" value={matches.toString()} />
              </View>
              <View style={styles.statCol}>
                <StatCard label="Wins" value={wins.toString()} />
              </View>
              <View style={styles.statCol}>
                <StatCard label="Losses" value={losses.toString()} />
              </View>
            </View>

            {/* Register Team Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Register Team & Squad</Text>
              <View style={styles.formCard}>
                {message ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓ {message}</Text>
                  </View>
                ) : null}
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠ {error}</Text>
                  </View>
                ) : null}

                {/* Tournament Selection */}
                <Text style={styles.label}>Choose Tournament</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowTourneys(!showTourneys)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownText}>{getSelectedTourneyLabel()}</Text>
                  <Text style={styles.dropdownArrow}>{showTourneys ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showTourneys && (
                  <View style={styles.dropdownMenu}>
                    {tournaments
                      .filter((t) => t.is_approved)
                      .map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedTourneyId(t.id.toString());
                            setShowTourneys(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}

                {/* Team Name */}
                <Text style={styles.label}>Team Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chennai Super Kings"
                  placeholderTextColor="#666"
                  value={teamName}
                  onChangeText={setTeamName}
                />

                {/* Coach Selection Auto-complete */}
                <Text style={styles.label}>Search & Choose Coach</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type to search coach (e.g. John)"
                  placeholderTextColor="#666"
                  value={coachSearch}
                  onChangeText={(val) => {
                    setCoachSearch(val);
                    if (selectedCoachId) setSelectedCoachId('');
                  }}
                />
                {coachSearch.length > 0 && !selectedCoachId && (
                  <View style={styles.suggestionsContainer}>
                    {filteredCoaches.length === 0 ? (
                      <Text style={styles.suggestionEmpty}>No matching coaches</Text>
                    ) : (
                      filteredCoaches.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setSelectedCoachId(c.id.toString());
                            setCoachSearch(c.full_name);
                          }}
                        >
                          <Text style={styles.suggestionText}>{c.full_name} ({c.email})</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
                {selectedCoachId ? (
                  <Text style={styles.selectionLabel}>✓ Selected Coach: {coachSearch}</Text>
                ) : null}

                {/* Player Selection Auto-complete */}
                <Text style={styles.label}>Search & Choose Players</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type to search player name (e.g. Ashwin)"
                  placeholderTextColor="#666"
                  value={playerSearch}
                  onChangeText={setPlayerSearch}
                />
                {playerSearch.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {filteredPlayers.length === 0 ? (
                      <Text style={styles.suggestionEmpty}>No matching players</Text>
                    ) : (
                      filteredPlayers.map((p) => {
                        const isSelected = selectedPlayerIds.includes(p.id);
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.suggestionItem,
                              isSelected && { backgroundColor: '#333333' },
                            ]}
                            onPress={() => {
                              togglePlayerSelect(p.id);
                            }}
                          >
                            <Text style={[styles.suggestionText, isSelected && { color: '#D4AF37', fontWeight: 'bold' }]}>
                              {isSelected ? '✓ ' : '+ '}
                              {p.full_name} ({p.email})
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {/* Selected Squad List */}
                <Text style={styles.label}>Current Squad Selection</Text>
                {selectedPlayerIds.length === 0 ? (
                  <Text style={styles.emptyText}>No players selected. Use search box above.</Text>
                ) : (
                  <View style={styles.chipsContainer}>
                    {selectedPlayerIds.map((id) => {
                      const p = players.find((pl) => pl.id === id);
                      return (
                        <TouchableOpacity
                          key={id}
                          style={styles.chip}
                          onPress={() => togglePlayerSelect(id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.chipText}>
                            {p ? p.full_name : `ID: ${id}`} ✕
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Submit Button with Spring Tap */}
                <Animated.View style={{ transform: [{ scale: squadBtnScale }] }}>
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleRegisterTeam}
                    onPressIn={handleSquadPressIn}
                    onPressOut={handleSquadPressOut}
                    disabled={submitting}
                    activeOpacity={0.9}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#141414" />
                    ) : (
                      <Text style={styles.submitButtonText}>Register Squad</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>

            {/* My Registered Squads */}
            <View style={[styles.section, { marginBottom: 30 }]}>
              <Text style={styles.sectionTitle}>My Squads</Text>
              {teams.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>🏏</Text>
                  <Text style={styles.emptyText}>Not registered in any squads yet.</Text>
                </View>
              ) : (
                teams.map((t, index) => (
                  <View key={index} style={styles.teamCard}>
                    <Text style={styles.teamIcon}>🏏</Text>
                    <Text style={styles.teamName}>{t}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'Statistics' && (
          <View style={styles.statsTabContainer}>
            <Text style={styles.sectionTitle}>Player Individual Stats</Text>
            <View style={styles.statsCard}>
              {[
                { label: 'Matches Played', val: matches },
                { label: 'Total Runs Scored', val: data.runs_scored ?? 0 },
                { label: 'Balls Faced', val: data.balls_faced ?? 0 },
                {
                  label: 'Batting Strike Rate',
                  val: data.balls_faced > 0
                    ? ((data.runs_scored / data.balls_faced) * 100).toFixed(2)
                    : '0.00'
                },
                { label: 'Wickets Taken', val: data.wickets_taken ?? 0 },
                { label: 'Runs Conceded', val: data.runs_conceded ?? 0 },
              ].map((item, index) => (
                <View key={index} style={styles.statRowItem}>
                  <Text style={styles.statLabel}>{item.label}</Text>
                  <Text style={styles.statVal}>{item.val}</Text>
                </View>
              ))}
              
              {/* Highlight Performance Rating */}
              <View style={[styles.statRowItem, styles.premiumRatingItem]}>
                <Text style={[styles.statLabel, { color: '#141414', fontWeight: '900' }]}>Performance Rating Index</Text>
                <Text style={[styles.statVal, { color: '#141414', fontWeight: '900', fontSize: 18 }]}>
                  {(data.performance_score ?? 0.0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Matches' && (
          <Animated.View style={{ opacity: listFade }}>
            <Text style={styles.sectionTitle}>Tournament Matches</Text>
            {loadingMatches ? (
              <ActivityIndicator color="#D4AF37" style={{ marginVertical: 30 }} />
            ) : matchesList.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateEmoji}>📅</Text>
                <Text style={styles.emptyText}>No tournament matches scheduled yet.</Text>
              </View>
            ) : (
              matchesList.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  activeOpacity={0.95}
                  onPress={() => {
                    setSelectedMatch(match);
                    setMatchDetailsTab('Summary');
                  }}
                >
                  <View style={styles.matchMain}>
                    <Text style={styles.matchTeams}>
                      {match.team_a_name} vs {match.team_b_name}
                    </Text>
                    <Text style={styles.matchTourneyName}>{match.tournamentName}</Text>
                    <Text style={styles.matchSummaryText}>
                      {match.score_summary || 'Live Scoreboard Pending'}
                    </Text>
                  </View>

                  {/* Oscillating Live Status Badge */}
                  <Animated.View
                    style={[
                      styles.matchStatusBadge,
                      match.status === 'live' && {
                        borderColor: '#FF3B30',
                        transform: [{ scale: badgePulse }]
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.matchStatusText,
                        match.status === 'live' && { color: '#FF3B30', fontWeight: '900' }
                      ]}
                    >
                      {match.status?.toUpperCase()}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              ))
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Match Details Modal (Summary, Scorecard, Wagon Wheel) */}
      <Modal
        visible={selectedMatch !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Match Analytics</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedMatch(null)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMatch && (
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTeamsSubTitle}>
                  {selectedMatch.team_a_name} vs {selectedMatch.team_b_name}
                </Text>

                {/* Modal Sub-Tabs */}
                <View style={styles.modalTabBar}>
                  {['Summary', 'Scorecard', 'Wagon Wheel'].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.modalTabButton,
                        matchDetailsTab === tab && styles.modalTabButtonActive,
                      ]}
                      onPress={() => setMatchDetailsTab(tab)}
                    >
                      <Text
                        style={[
                          styles.modalTabButtonText,
                          matchDetailsTab === tab && styles.modalTabButtonTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <ScrollView style={{ flex: 1, marginTop: 12 }}>
                  {matchDetailsTab === 'Summary' && (
                    <View style={styles.summaryContainer}>
                      <View style={styles.summaryStatusBox}>
                        <Text style={styles.summaryStatusTitle}>Match Status</Text>
                        <Text style={styles.summaryStatusVal}>
                          {selectedMatch.status?.toUpperCase() || 'UPCOMING'}
                        </Text>
                      </View>
                      
                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryLabel}>Score Board</Text>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.summaryVal}>
                            🏏 {selectedMatch.team_a_name || selectedMatch.team_a?.name || 'Team A'}: {selectedMatch.team_a_runs ?? 0} / {selectedMatch.team_a_wickets ?? 0} ({selectedMatch.team_a_overs ?? 0.0} ov)
                          </Text>
                          <Text style={styles.summaryVal}>
                            🏏 {selectedMatch.team_b_name || selectedMatch.team_b?.name || 'Team B'}: {selectedMatch.team_b_runs ?? 0} / {selectedMatch.team_b_wickets ?? 0} ({selectedMatch.team_b_overs ?? 0.0} ov)
                          </Text>
                        </View>
                      </View>

                      {selectedMatch.winner && (
                        <View style={styles.summaryStatItem}>
                          <Text style={styles.summaryLabel}>Winner</Text>
                          <Text style={[styles.summaryVal, { fontWeight: 'bold', color: '#D4AF37' }]}>
                            🏆 {selectedMatch.winner.name || selectedMatch.winner_name || 'Won'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryLabel}>Tournament</Text>
                        <Text style={styles.summaryVal}>{selectedMatch.tournamentName || selectedMatch.tournament?.name}</Text>
                      </View>
                    </View>
                  )}

                  {matchDetailsTab === 'Scorecard' && (
                    <View style={styles.scorecardContainer}>
                      <Text style={styles.scorecardTeamTitle}>{selectedMatch.team_a?.name || selectedMatch.team_a_name || 'Team A'} Roster</Text>
                      <View style={{ marginBottom: 16, paddingLeft: 4 }}>
                        {(selectedMatch.team_a?.players || []).map((p, idx) => (
                          <Text key={idx} style={{ fontSize: 14, color: '#F5F5F5', marginVertical: 6 }}>
                            👤 {p.player?.full_name || p.player?.email || 'Unknown Player'}
                          </Text>
                        ))}
                        {(!selectedMatch.team_a?.players || selectedMatch.team_a.players.length === 0) && (
                          <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No registered players.</Text>
                        )}
                      </View>

                      <Text style={styles.scorecardTeamTitle}>{selectedMatch.team_b?.name || selectedMatch.team_b_name || 'Team B'} Roster</Text>
                      <View style={{ paddingLeft: 4 }}>
                        {(selectedMatch.team_b?.players || []).map((p, idx) => (
                          <Text key={idx} style={{ fontSize: 14, color: '#F5F5F5', marginVertical: 6 }}>
                            👤 {p.player?.full_name || p.player?.email || 'Unknown Player'}
                          </Text>
                        ))}
                        {(!selectedMatch.team_b?.players || selectedMatch.team_b.players.length === 0) && (
                          <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No registered players.</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {matchDetailsTab === 'Wagon Wheel' && (
                    <View style={styles.wagonWheelContainer}>
                      <Text style={styles.wagonTitle}>Shot Placement distribution</Text>
                      {/* Graphical Wagon Wheel simulation using native views */}
                      <View style={styles.wheelCircle}>
                        {/* Crease / Central pitch */}
                        <View style={styles.crease} />
                        {/* Boundaries shots */}
                        <View style={[styles.shotLine, { transform: [{ rotate: '45deg' }], width: 100, backgroundColor: '#D4AF37' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '120deg' }], width: 90, backgroundColor: '#888888' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '210deg' }], width: 110, backgroundColor: '#D4AF37' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '315deg' }], width: 80, backgroundColor: '#555555' }]} />
                        
                        <Text style={[styles.wheelLabel, { top: 12, left: 100 }]}>Off Side</Text>
                        <Text style={[styles.wheelLabel, { bottom: 12, left: 100 }]}>On Side</Text>
                        <Text style={[styles.wheelLabel, { top: 100, left: 12 }]}>Leg</Text>
                        <Text style={[styles.wheelLabel, { top: 100, right: 12 }]}>Off</Text>
                      </View>
                      <View style={styles.wagonLegend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#D4AF37' }]} />
                          <Text style={styles.legendText}>Boundaries / Sixes</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#888888' }]} />
                          <Text style={styles.legendText}>Singles / Doubles</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    marginBottom: 20,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    overflow: 'hidden',
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  tabButtonText: {
    color: '#888888',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#D4AF37',
  },
  scrollContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statCol: {
    flex: 1,
  },
  section: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  formCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
  },
  label: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    marginBottom: 4,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  dropdownText: {
    color: '#F5F5F5',
    fontSize: 14,
  },
  dropdownArrow: {
    color: '#D4AF37',
    fontSize: 12,
  },
  dropdownMenu: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  dropdownItemText: {
    color: '#F5F5F5',
    fontSize: 14,
  },
  suggestionsContainer: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    maxHeight: 150,
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  suggestionText: {
    color: '#F5F5F5',
    fontSize: 13,
  },
  suggestionEmpty: {
    padding: 12,
    color: '#888888',
    fontSize: 13,
  },
  selectionLabel: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
    paddingVertical: 8,
  },
  teamCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    padding: 16,
    marginBottom: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#D4AF37',
  },
  teamName: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#141414',
    fontWeight: '900',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#1E2C1E',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    color: '#81C784',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#3C1F1F',
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#E57373',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statsTabContainer: {
    backgroundColor: '#141414',
  },
  statsCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
  },
  statRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  statLabel: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  statVal: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  premiumRatingItem: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 16,
    borderBottomWidth: 0,
  },
  matchCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchMain: {
    flex: 1,
    paddingRight: 12,
  },
  matchTeams: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 6,
  },
  matchTourneyName: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  matchSummaryText: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
  },
  matchStatusBadge: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  matchStatusText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D4AF37',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
    maxHeight: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5F5F5',
  },
  modalTeamsSubTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginVertical: 14,
  },
  modalTabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
  },
  modalTabButtonActive: {
    backgroundColor: '#2A2A2A',
  },
  modalTabButtonText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalTabButtonTextActive: {
    color: '#D4AF37',
  },
  summaryContainer: {
    padding: 6,
  },
  summaryStatusBox: {
    borderWidth: 1,
    borderColor: '#2D2D2D',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryStatusTitle: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 6,
    fontWeight: '700',
  },
  summaryStatusVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D4AF37',
  },
  summaryStatItem: {
    marginBottom: 18,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888888',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  summaryVal: {
    fontSize: 15,
    color: '#F5F5F5',
    fontWeight: '600',
  },
  scorecardContainer: {
    padding: 6,
  },
  scorecardTeamTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  wagonWheelContainer: {
    alignItems: 'center',
    padding: 10,
  },
  wagonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 20,
  },
  wheelCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#3D3D3D',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  crease: {
    width: 40,
    height: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    backgroundColor: '#1F1F1F',
    position: 'absolute',
  },
  shotLine: {
    height: 2,
    position: 'absolute',
    left: 110,
    transformOrigin: 'left center',
  },
  wheelLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888888',
  },
  wagonLegend: {
    marginTop: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#888888',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
});

export default PlayerDashboard;
