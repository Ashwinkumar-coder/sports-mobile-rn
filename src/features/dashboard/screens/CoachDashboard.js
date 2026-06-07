import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import StatCard from '../widgets/StatCard';

const CoachDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  apiClient,
  activeTab: parentActiveTab,
}) => {
  const teamsCount = data.teams_trained_count ?? 0;
  const trainees = data.players ?? [];

  // Active Tab
  const [localTab, setLocalTab] = useState('Trainees'); // 'Trainees', 'Matches'
  const activeTab = parentActiveTab || localTab;
  const setActiveTab = setLocalTab;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    const tabs = ['Trainees', 'Matches'];
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

  // Tournament Matches List States
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard'

  // Pulse animation for active matches
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

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

  const renderPlayerItem = ({ item }) => (
    <View style={styles.playerCard}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.full_name}</Text>
        <Text style={styles.playerStats}>
          Runs: {item.runs_scored}  |  Wickets: {item.wickets_taken}  |  Balls: {item.balls_faced}
        </Text>
      </View>
      <View style={styles.indexBox}>
        <Text style={styles.indexLabel}>INDEX RATING</Text>
        <Text style={styles.indexValue}>{(item.performance_score ?? 0.0).toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#141414' }}>
      {/* Dashboard Sub-Tabs */}
      {!parentActiveTab && (
        <View style={styles.tabBar}>
          {['Trainees', 'Matches'].map((tab) => (
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

      {activeTab === 'Trainees' && (
        <FlatList
          data={trainees}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={styles.statContainer}>
                <StatCard label="Teams Trained / Coached" value={teamsCount.toString()} />
              </View>
              <Text style={styles.sectionTitle}>TRAINEE LEADERBOARD</Text>
            </View>
          }
          renderItem={renderPlayerItem}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>🏆</Text>
              <Text style={styles.emptyText}>No trainee player statistics available yet.</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {activeTab === 'Matches' && (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>TOURNAMENT MATCHES</Text>
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
                activeOpacity={0.9}
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
        </ScrollView>
      )}

      {/* Match Details Modal (Summary, Scorecard) */}
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
                  {['Summary', 'Scorecard'].map((tab) => (
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
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#2D2D2D',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    margin: 12,
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
    fontWeight: 'bold',
    fontSize: 12,
    color: '#888888',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#D4AF37',
  },
  listContainer: {
    paddingBottom: 24,
  },
  statContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  playerCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  playerName: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerStats: {
    color: '#888888',
    fontSize: 12,
  },
  indexBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    borderLeftWidth: 1,
    borderLeftColor: '#2D2D2D',
    paddingLeft: 8,
  },
  indexLabel: {
    color: '#888888',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  indexValue: {
    color: '#D4AF37',
    fontWeight: '900',
    fontSize: 16,
    marginTop: 2,
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
    paddingVertical: 16,
  },
  matchCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchMain: {
    flex: 1,
    paddingRight: 8,
  },
  matchTeams: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchTourneyName: {
    fontSize: 11,
    color: '#888888',
    marginVertical: 6,
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
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#2D2D2D',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  modalCloseBtn: {
    padding: 4,
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
    marginBottom: 8,
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
  },
  modalTabButtonActive: {
    backgroundColor: '#2A2A2A',
  },
  modalTabButtonText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: 'bold',
  },
  modalTabButtonTextActive: {
    color: '#D4AF37',
  },
  summaryContainer: {
    paddingVertical: 10,
  },
  summaryStatusBox: {
    borderWidth: 1,
    borderColor: '#2D2D2D',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryStatusTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888888',
  },
  summaryStatusVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D4AF37',
    marginTop: 4,
  },
  summaryStatItem: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888888',
  },
  summaryVal: {
    fontSize: 15,
    color: '#F5F5F5',
    marginTop: 4,
    fontWeight: '600',
  },
  scorecardContainer: {
    paddingVertical: 10,
  },
  scorecardTeamTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 0.5,
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

export default CoachDashboard;
