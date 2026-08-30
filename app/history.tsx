import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase, ObservationRepository } from '../src/db';
import { Observation } from '../src/types';

function getSyncStatusTextStyle(status: string): TextStyle {
  return {
    fontSize: 12,
    fontWeight: '600',
    color: status === 'synced' ? '#34D399' : status === 'syncing' ? '#60A5FA' : '#FBBF24',
  };
}

export default function HistoryScreen() {
  const router = useRouter();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [filtered, setFiltered] = useState<Observation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'confirmed' | 'rejected' | 'unsure' | 'pending_sync'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadObservations = async () => {
    try {
      const db = await getDatabase();
      const obsRepo = new ObservationRepository(db);
      const list = await obsRepo.listAll();
      setObservations(list);
    } catch (err) {
      console.warn('Error loading observation history:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadObservations();
  }, []);

  useEffect(() => {
    let result = observations;

    if (activeFilter === 'confirmed') {
      result = result.filter((o) => o.userVerdict === 'confirmed');
    } else if (activeFilter === 'rejected') {
      result = result.filter((o) => o.userVerdict === 'rejected');
    } else if (activeFilter === 'unsure') {
      result = result.filter((o) => o.userVerdict === 'unsure');
    } else if (activeFilter === 'pending_sync') {
      result = result.filter((o) => o.syncStatus !== 'synced');
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.speciesPrediction.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          (o.userVerdict && o.userVerdict.toLowerCase().includes(q))
      );
    }

    setFiltered(result);
  }, [observations, activeFilter, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Search & Filter Header */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search observations..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'confirmed', 'rejected', 'unsure', 'pending_sync'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter === 'all'
                ? 'All'
                : filter === 'pending_sync'
                ? 'Pending Sync'
                : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Observation List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadObservations();
            }}
            tintColor="#F97316"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No matching observations found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => router.push(`/details/${item.id}`)}
            activeOpacity={0.75}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.itemSpecies}>
                {item.speciesPrediction === 'monarch' ? 'Monarch Butterfly' : 'Other Insect/Species'}
              </Text>
              <Text style={styles.itemProbability}>
                {(item.monarchProbability * 100).toFixed(1)}%
              </Text>
            </View>

            <Text style={styles.itemDate}>
              {new Date(item.capturedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>

            <View style={styles.itemFooter}>
              <View
                style={[
                  styles.verdictBadge,
                  {
                    backgroundColor:
                      item.userVerdict === 'confirmed'
                        ? '#064E3B'
                        : item.userVerdict === 'rejected'
                        ? '#7F1D1D'
                        : '#1E293B',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.verdictText,
                    {
                      color:
                        item.userVerdict === 'confirmed'
                          ? '#34D399'
                          : item.userVerdict === 'rejected'
                          ? '#F87171'
                          : '#94A3B8',
                    },
                  ]}
                >
                  {item.userVerdict ? item.userVerdict.toUpperCase() : 'PENDING'}
                </Text>
              </View>

              <Text style={getSyncStatusTextStyle(item.syncStatus)}>
                {item.syncStatus === 'synced'
                  ? '✓ Synced'
                  : item.syncStatus === 'syncing'
                  ? '⟳ Syncing'
                  : '⏳ Offline Outbox'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#EA580C',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  itemCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSpecies: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemProbability: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  itemDate: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verdictText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
