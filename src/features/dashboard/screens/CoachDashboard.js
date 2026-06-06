import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import StatCard from '../widgets/StatCard';

const CoachDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  apiClient,
}) => {
  const teamsCount = data.teams_trained_count ?? 0;
  const trainees = data.players ?? [];

  // Active Tab
  const [activeTab, setActiveTab] = useState('Trainees'); // 'Trainees', 'Matches'

  // Tournament Matches List States
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard'

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
          Runs: {item.runs_scored} | Wickets: {item.wickets_taken} | Balls: {item.balls_faced}
        </Text>
      </View>
      <View style={styles.indexBox}>
        <Text style={styles.indexLabel}>Index Rating</Text>
        <Text style={styles.indexValue}>{(item.performance_score ?? 0.0).toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Dashboard Sub-Tabs */}
      <View style={styles.tabBar}>
        {['Trainees', 'Matches'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
            <View style={{ paddingHorizontal: 16 }}>
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
            <ActivityIndicator color="#000" style={{ marginVertical: 30 }} />
          ) : matchesList.length === 0 ? (
            <Text style={styles.emptyText}>No tournament matches scheduled yet.</Text>
          ) : (
            matchesList.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
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
                <View style={styles.matchStatusBadge}>
                  <Text style={styles.matchStatusText}>{match.status?.toUpperCase()}</Text>
                </View>
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
                          <Text style={[styles.summaryVal, { fontWeight: 'bold', color: '#2E7D32' }]}>
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
                      <View style={{ marginBottom: 12, paddingLeft: 4 }}>
                        {(selectedMatch.team_a?.players || []).map((p, idx) => (
                          <Text key={idx} style={{ fontSize: 13, color: '#000', marginVertical: 4 }}>
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
                          <Text key={idx} style={{ fontSize: 13, color: '#000', marginVertical: 4 }}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderColor: '#000000',
  },
  tabButtonText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#888888',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#000000',
  },
  listContainer: {
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  statContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
    letterSpacing: 1,
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 16,
    marginBottom: 8,
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
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerStats: {
    color: '#666666',
    fontSize: 12,
  },
  indexBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    borderLeftWidth: 1,
    borderLeftColor: '#EEEEEE',
    paddingLeft: 8,
  },
  indexLabel: {
    color: '#888888',
    fontSize: 8,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  indexValue: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
  },
  emptyText: {
    color: '#666666',
    fontSize: 13,
    paddingVertical: 16,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchMain: {
    flex: 1,
    paddingRight: 8,
  },
  matchTeams: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  matchTourneyName: {
    fontSize: 11,
    color: '#666666',
    marginVertical: 4,
  },
  matchSummaryText: {
    fontSize: 12,
    color: '#000000',
    fontStyle: 'italic',
  },
  matchStatusBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalTeamsSubTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333',
    marginVertical: 10,
    textAlign: 'center',
  },
  modalTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 8,
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalTabButtonActive: {
    borderBottomWidth: 2,
    borderColor: '#000000',
  },
  modalTabButtonText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: 'bold',
  },
  modalTabButtonTextActive: {
    color: '#000000',
  },
  summaryContainer: {
    paddingVertical: 10,
  },
  summaryStatusBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryStatusTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888888',
    textTransform: 'uppercase',
  },
  summaryStatusVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 4,
  },
  summaryStatItem: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888888',
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontSize: 14,
    color: '#000000',
    marginTop: 4,
  },
  scorecardContainer: {
    paddingVertical: 10,
  },
  scorecardTeamTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#000000',
    paddingBottom: 4,
  },
});

export default CoachDashboard;
