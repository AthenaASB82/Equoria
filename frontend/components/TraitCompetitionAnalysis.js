/**
 * TraitCompetitionAnalysis Component
 * Displays trait impact analysis for competition performance
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

/**
 * TraitCompetitionAnalysis Component
 * @param {Object} props - Component props
 * @param {number} props.horseId - ID of the horse
 * @param {string} props.horseName - Name of the horse
 * @param {string} props.selectedDiscipline - Currently selected discipline
 * @param {Function} props.onDisciplineChange - Callback when discipline changes
 */
const TraitCompetitionAnalysis = ({
  horseId,
  horseName,
  selectedDiscipline = 'Show Jumping',
  onDisciplineChange,
}) => {
  const [analysis, setAnalysis] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');

  const disciplines = [
    'Dressage',
    'Show Jumping',
    'Cross Country',
    'Racing',
    'Endurance',
    'Reining',
    'Driving',
    'Trail',
    'Eventing',
  ];

  // Fetch trait impact analysis for specific discipline
  const fetchAnalysis = async (discipline) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/traits/competition-impact/${horseId}?discipline=${encodeURIComponent(discipline)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trait analysis');
      }

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.data);
      } else {
        throw new Error(data.message || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch comparison across all disciplines
  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/traits/competition-comparison/${horseId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trait comparison');
      }

      const data = await response.json();
      if (data.success) {
        setComparison(data.data);
      } else {
        throw new Error(data.message || 'Comparison failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or discipline changes
  useEffect(() => {
    if (horseId) {
      if (activeTab === 'analysis') {
        fetchAnalysis(selectedDiscipline);
      } else {
        fetchComparison();
      }
    }
  }, [horseId, selectedDiscipline, activeTab]);

  // Handle discipline selection
  const handleDisciplineSelect = (discipline) => {
    onDisciplineChange?.(discipline);
    if (activeTab === 'analysis') {
      fetchAnalysis(discipline);
    }
  };

  // Get effect color based on type and value
  const getEffectColor = (type, modifier) => {
    if (type === 'positive' || modifier > 0) {
      return 'text-green-600';
    } else if (type === 'negative' || modifier < 0) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  // Get effect icon
  const getEffectIcon = (type, modifier) => {
    if (type === 'positive' || modifier > 0) {
      return '↗️';
    } else if (type === 'negative' || modifier < 0) {
      return '↘️';
    }
    return '➡️';
  };

  const AnalysisTab = () => (
    <View className="flex-1">
      {/* Discipline Selector */}
      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-800 mb-2">
          Select Discipline
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {disciplines.map((discipline) => (
              <TouchableOpacity
                key={discipline}
                onPress={() => handleDisciplineSelect(discipline)}
                className={`px-4 py-2 rounded-lg border ${
                  selectedDiscipline === discipline
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedDiscipline === discipline
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {discipline}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Analysis Results */}
      {analysis && (
        <View className="space-y-4">
          {/* Summary Card */}
          <View className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Competition Impact Summary
            </Text>

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Overall Effect:</Text>
              <Text
                className={`font-semibold ${getEffectColor(null, analysis.analysis.traitModifier)}`}
              >
                {analysis.analysis.percentageChange}%
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Score Adjustment:</Text>
              <Text
                className={`font-semibold ${getEffectColor(null, analysis.analysis.scoreAdjustment)}`}
              >
                {analysis.analysis.scoreAdjustment > 0 ? '+' : ''}
                {analysis.analysis.scoreAdjustment.toFixed(1)} points
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Net Effect:</Text>
              <View className="flex-row items-center">
                <Text className="mr-1">
                  {getEffectIcon(null, analysis.analysis.traitModifier)}
                </Text>
                <Text
                  className={`font-semibold ${getEffectColor(null, analysis.analysis.traitModifier)}`}
                >
                  {analysis.summary.netEffect.charAt(0).toUpperCase() +
                    analysis.summary.netEffect.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Trait Details */}
          {analysis.traits.details.length > 0 && (
            <View className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <Text className="text-lg font-bold text-gray-800 mb-3">
                Trait Effects ({analysis.traits.total} traits)
              </Text>

              {analysis.traits.details.map((trait, index) => (
                <View key={index} className="mb-3 last:mb-0">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1">
                      <Text className="mr-2">
                        {getEffectIcon(trait.type, trait.modifier)}
                      </Text>
                      <Text className="font-semibold text-gray-800 flex-1">
                        {trait.name}
                      </Text>
                      {trait.isSpecialized && (
                        <View className="bg-blue-100 px-2 py-1 rounded-full mr-2">
                          <Text className="text-blue-800 text-xs font-medium">
                            Specialized
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`font-bold ${getEffectColor(trait.type, trait.modifier)}`}
                    >
                      {trait.percentageEffect}
                    </Text>
                  </View>
                  <Text className="text-gray-600 text-sm ml-6">
                    {trait.description}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* No Traits Message */}
          {analysis.traits.total === 0 && (
            <View className="bg-gray-50 rounded-lg p-6 text-center">
              <Text className="text-gray-600 text-lg mb-2">
                No Visible Traits
              </Text>
              <Text className="text-gray-500">
                This horse has no visible traits that affect competition
                performance. Hidden traits may be discovered through bonding and
                training.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const ComparisonTab = () => (
    <View className="flex-1">
      {comparison && (
        <View className="space-y-4">
          {/* Best/Worst Summary */}
          <View className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Discipline Recommendations
            </Text>

            <View className="mb-3">
              <Text className="text-green-600 font-semibold mb-1">
                🏆 Best Discipline: {comparison.summary.bestDiscipline.name}
              </Text>
              <Text className="text-gray-600 text-sm">
                {comparison.summary.bestDiscipline.effect} impact
                {comparison.summary.bestDiscipline.specializedTraits > 0 &&
                  ` (${comparison.summary.bestDiscipline.specializedTraits} specialized traits)`}
              </Text>
            </View>

            <View>
              <Text className="text-red-600 font-semibold mb-1">
                ⚠️ Challenging Discipline:{' '}
                {comparison.summary.worstDiscipline.name}
              </Text>
              <Text className="text-gray-600 text-sm">
                {comparison.summary.worstDiscipline.effect} impact
                {comparison.summary.worstDiscipline.specializedTraits > 0 &&
                  ` (${comparison.summary.worstDiscipline.specializedTraits} specialized traits)`}
              </Text>
            </View>
          </View>

          {/* Discipline Comparison List */}
          <View className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              All Disciplines
            </Text>

            {comparison.comparison.map((disc, index) => (
              <TouchableOpacity
                key={disc.discipline}
                onPress={() => {
                  setActiveTab('analysis');
                  handleDisciplineSelect(disc.discipline);
                }}
                className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800">
                    {disc.discipline}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {disc.specializedTraits > 0 &&
                      `${disc.specializedTraits} specialized traits`}
                  </Text>
                </View>

                <View className="items-end">
                  <Text
                    className={`font-bold ${getEffectColor(null, disc.modifier)}`}
                  >
                    {disc.percentageEffect}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {disc.netEffect}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Statistics */}
          <View className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Statistics
            </Text>

            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Average Effect:</Text>
              <Text className="font-semibold">
                {comparison.summary.averageEffect}
              </Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Favorable Disciplines:</Text>
              <Text className="font-semibold text-green-600">
                {comparison.summary.disciplinesWithBonuses}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Challenging Disciplines:</Text>
              <Text className="font-semibold text-red-600">
                {comparison.summary.disciplinesWithPenalties}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-8">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Analyzing trait impact...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-red-50 rounded-lg p-4 border border-red-200">
        <Text className="text-red-800 font-medium mb-2">Analysis Error</Text>
        <Text className="text-red-700 mb-3">{error}</Text>
        <TouchableOpacity
          onPress={() =>
            activeTab === 'analysis'
              ? fetchAnalysis(selectedDiscipline)
              : fetchComparison()
          }
          className="bg-red-500 rounded-lg py-2 px-4 self-start"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="mb-4">
        <Text className="text-xl font-bold text-gray-800">
          Trait Competition Analysis
        </Text>
        <Text className="text-gray-600">{horseName}</Text>
      </View>

      {/* Tab Selector */}
      <View className="flex-row mb-4 bg-gray-100 rounded-lg p-1">
        <TouchableOpacity
          onPress={() => setActiveTab('analysis')}
          className={`flex-1 py-2 px-4 rounded-md ${
            activeTab === 'analysis' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'analysis' ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            Discipline Analysis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('comparison')}
          className={`flex-1 py-2 px-4 rounded-md ${
            activeTab === 'comparison' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'comparison' ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            Compare All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1">
        {activeTab === 'analysis' ? <AnalysisTab /> : <ComparisonTab />}
      </ScrollView>
    </View>
  );
};

export default TraitCompetitionAnalysis;
