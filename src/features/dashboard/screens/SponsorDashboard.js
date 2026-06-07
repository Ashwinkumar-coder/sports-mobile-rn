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

const SponsorDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  apiClient,
  onRefresh,
  activeTab: parentActiveTab,
}) => {
  const total = data.total_sponsored ?? 0.0;
  const history = data.sponsorships ?? [];

  // Active Tab
  const [localTab, setLocalTab] = useState('Sponsorships'); // 'Sponsorships', 'Matches'
  const activeTab = parentActiveTab || localTab;
  const setActiveTab = setLocalTab;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    const tabs = ['Sponsorships', 'Matches'];
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

  // Form States
  const [selectedTourneyId, setSelectedTourneyId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showTourneys, setShowTourneys] = useState(false);

  // Tournament Matches List States
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard'

  // Spring animations
  const btnScale = useRef(new Animated.Value(1)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.12,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.95,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

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

  const handlePledge = async () => {
    if (!selectedTourneyId || !amount) {
      setError('Please choose a tournament and enter amount.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.sponsorTournament(
        parseInt(selectedTourneyId),
        parseFloat(amount)
      );

      if (res && res.id) {
        setMessage(`Pledge of $${amount} submitted for approval!`);
        setAmount('');
        setSelectedTourneyId('');
        if (onRefresh) onRefresh();
      } else {
        setError(res?.detail || 'Failed to submit pledge.');
      }
    } catch (e) {
      setError('Could not connect to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedTourneyLabel = () => {
    const tourney = tournaments.find((t) => t.id.toString() === selectedTourneyId);
    return tourney ? tourney.name : 'Select Tournament';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#141414' }}>
      {/* Dashboard Sub-Tabs */}
      {!parentActiveTab && (
        <View style={styles.tabBar}>
          {['Sponsorships', 'Matches'].map((tab) => (
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

      <ScrollView style={styles.container} nestedScrollEnabled={true}>
        {activeTab === 'Sponsorships' && (
          <View>
            <View style={styles.statContainer}>
              <StatCard label="Total Sponsorship Pledges" value={`$${total}`} />
            </View>

            {/* Sponsorship Pledge Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sponsor a Tournament</Text>
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
                <Text style={styles.label}>Select Tournament</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => setShowTourneys(!showTourneys)}
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

                {/* Pledge Amount */}
                <Text style={styles.label}>Pledge Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1500"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />

                {/* Submit Button */}
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handlePledge}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={submitting}
                    activeOpacity={0.9}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#141414" />
                    ) : (
                      <Text style={styles.submitButtonText}>SUBMIT PLEDGE</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>

            {/* Contribution History */}
            <View style={[styles.section, { marginBottom: 40 }]}>
              <Text style={styles.sectionTitle}>Pledges & Outcomes History</Text>
              {history.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>💼</Text>
                  <Text style={styles.emptyText}>No sponsorship contributions registered.</Text>
                </View>
              ) : (
                history.map((item, index) => (
                  <View key={index} style={styles.pledgeCard}>
                    <View style={styles.pledgeInfo}>
                      <Text style={styles.tournamentName}>{item.tournament_name}</Text>
                      <Text style={styles.tournamentStatus}>Tournament: {item.tournament_status}</Text>
                      <Text style={styles.sponsorshipStatus}>Sponsorship: {item.status || 'pending'}</Text>
                    </View>
                    <Text style={styles.pledgeAmount}>${item.amount}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'Matches' && (
          <View style={{ marginBottom: 40 }}>
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
          </View>
        )}
      </ScrollView>

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
  statContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
    paddingVertical: 8,
  },
  pledgeCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pledgeInfo: {
    flex: 1,
    paddingRight: 8,
  },
  tournamentName: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentStatus: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 2,
  },
  sponsorshipStatus: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pledgeAmount: {
    color: '#D4AF37',
    fontWeight: '900',
    fontSize: 18,
  },
  formCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
  },
  label: {
    color: '#888888',
    fontSize: 11,
    fontWeight: 'bold',
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

export default SponsorDashboard;
