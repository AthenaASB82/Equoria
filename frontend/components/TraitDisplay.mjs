// skipcq: JS-0128
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * TraitDisplay Component
 * Displays horse epigenetic traits with positive/negative badges and hidden placeholders
 * @param {Object} props - Component props
 * @param {Object} props.traits - Traits object with positive, negative, and hidden arrays
 * @param {string} props.horseName - Name of the horse (for accessibility)
 * @param {Function} props.onTraitPress - Optional callback when trait is pressed
 */
const TraitDisplay = ({ traits = {}, horseName = 'Horse', onTraitPress }) => {
  const [selectedTrait, setSelectedTrait] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Trait definitions with descriptions and metadata
  const traitDefinitions = {
    // Positive traits
    resilient: {
      name: 'Resilient',
      type: 'positive',
      description:
        'This horse recovers quickly from stress and setbacks. Resilient horses bounce back faster from training challenges and maintain better emotional stability.',
      effects: 'Faster stress recovery, improved training consistency',
    },
    bold: {
      name: 'Bold',
      type: 'positive',
      description:
        'A naturally brave horse that faces new challenges with confidence. Bold horses excel in competitive environments and adapt well to new situations.',
      effects: 'Enhanced competition performance, better adaptability',
    },
    intelligent: {
      name: 'Intelligent',
      type: 'positive',
      description:
        'Exceptionally smart and quick to learn. Intelligent horses master new skills faster and retain training better.',
      effects: 'Accelerated learning, improved skill retention',
    },
    athletic: {
      name: 'Athletic',
      type: 'positive',
      description:
        'Superior physical coordination and natural movement. Athletic horses have enhanced physical capabilities across all disciplines.',
      effects: 'Improved physical stats, better movement quality',
    },
    calm: {
      name: 'Calm',
      type: 'positive',
      description:
        'Naturally peaceful and composed temperament. Calm horses handle stress better and are easier to train.',
      effects: 'Reduced stress accumulation, improved focus',
    },
    trainability_boost: {
      name: 'Trainability Boost',
      type: 'positive',
      description:
        'Enhanced ability to learn and respond to training. This rare trait significantly improves all training outcomes.',
      effects: 'Major training efficiency bonus, faster skill development',
    },

    // Negative traits
    nervous: {
      name: 'Nervous',
      type: 'negative',
      description:
        'Prone to anxiety and stress in challenging situations. Nervous horses require more careful handling and patience during training.',
      effects: 'Increased stress sensitivity, requires gentle approach',
    },
    stubborn: {
      name: 'Stubborn',
      type: 'negative',
      description:
        'Resistant to change and new training methods. Stubborn horses take longer to learn new skills but may excel once they master them.',
      effects: 'Slower initial learning, increased training time required',
    },
    fragile: {
      name: 'Fragile',
      type: 'negative',
      description:
        'More susceptible to injury and health issues. Fragile horses need extra care and monitoring during training.',
      effects: 'Higher injury risk, requires careful training management',
    },
    aggressive: {
      name: 'Aggressive',
      type: 'negative',
      description:
        'Tendency toward hostile behavior with handlers and other horses. Requires experienced handling and specialized training approaches.',
      effects: 'Handling challenges, social difficulties',
    },
    lazy: {
      name: 'Lazy',
      type: 'negative',
      description:
        'Low motivation and energy levels. Lazy horses require extra encouragement and may progress more slowly in training.',
      effects: 'Reduced training efficiency, requires motivation techniques',
    },
  };

  // Get trait definition or create default
  const getTraitInfo = (traitKey) => {
    return (
      traitDefinitions[traitKey] || {
        name: traitKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type: 'unknown',
        description: "This trait affects the horse's behavior and abilities in unique ways.",
        effects: 'Various effects on horse development and performance',
      }
    );
  };

  // Handle trait press
  const handleTraitPress = (traitKey) => {
    const traitInfo = getTraitInfo(traitKey);
    setSelectedTrait({ key: traitKey, ...traitInfo });
    setModalVisible(true);

    // Call optional callback
    if (onTraitPress) {
      onTraitPress(traitKey, traitInfo);
    }
  };

  // Close modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedTrait(null);
  };

  // Trait badge component
  const TraitBadge = ({ traitKey, type, isHidden = false }) => {
    const traitInfo = getTraitInfo(traitKey);

    if (isHidden) {
      return (
        <View
          className="px-3 py-2 rounded-full border-2 border-dashed border-gray-400 bg-gray-100 mx-1 mb-2"
          accessibilityRole="button"
          accessibilityLabel="Hidden trait - not yet discovered"
          accessibilityHint="This trait will be revealed as you learn more about your horse"
        >
          <Text className="text-gray-500 text-sm font-medium">???</Text>
        </View>
      );
    }

    const bgColor = type === 'positive' ? 'bg-green-500' : 'bg-red-500';
    const textColor = 'text-white';

    return (
      <TouchableOpacity
        className={`px-3 py-2 rounded-full ${bgColor} mx-1 mb-2 shadow-sm`}
        onPress={() => handleTraitPress(traitKey)}
        accessibilityRole="button"
        accessibilityLabel={`${traitInfo.name} trait - ${type}`}
        accessibilityHint="Tap to view detailed description"
      >
        <Text className={`${textColor} text-sm font-medium`}>{traitInfo.name}</Text>
      </TouchableOpacity>
    );
  };

  // Section component
  const TraitSection = ({ title, traits, type, icon }) => {
    if (!traits || traits.length === 0) return null;

    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Text className="text-lg font-bold text-gray-800 mr-2">{title}</Text>
          <Text className="text-lg">{icon}</Text>
        </View>
        <View className="flex-row flex-wrap">
          {traits.map((trait, index) => (
            <TraitBadge key={`${type}-${trait}-${index}`} traitKey={trait} type={type} />
          ))}
        </View>
      </View>
    );
  };

  // Hidden traits section
  const HiddenTraitsSection = ({ hiddenTraits }) => {
    if (!hiddenTraits || hiddenTraits.length === 0) return null;

    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Text className="text-lg font-bold text-gray-800 mr-2">Undiscovered</Text>
          <Text className="text-lg">🔍</Text>
        </View>
        <View className="flex-row flex-wrap">
          {hiddenTraits.map((trait, index) => (
            <TraitBadge
              key={`hidden-${trait}-${index}`}
              traitKey={trait}
              type="hidden"
              isHidden={true}
            />
          ))}
        </View>
      </View>
    );
  };

  // Modal component
  const TraitModalHeader = ({ selectedTrait, closeModal }) => (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center">
        <View
          className={`px-3 py-1 rounded-full mr-3 ${
            selectedTrait.type === 'positive' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          <Text className="text-white text-sm font-medium">{selectedTrait.name}</Text>
        </View>
        <Text className="text-lg">{selectedTrait.type === 'positive' ? '✨' : '⚠️'}</Text>
      </View>
      <TouchableOpacity
        onPress={closeModal}
        className="p-2"
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text className="text-gray-500 text-xl font-bold">×</Text>
      </TouchableOpacity>
    </View>
  );

  const TraitModalContent = ({ selectedTrait }) => (
    <ScrollView className="max-h-64">
      <Text className="text-gray-800 text-base leading-6 mb-4">{selectedTrait.description}</Text>
      <View className="bg-gray-50 rounded-lg p-3">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Effects:</Text>
        <Text className="text-sm text-gray-600">{selectedTrait.effects}</Text>
      </View>
    </ScrollView>
  );

  const TraitModalFooter = ({ closeModal }) => (
    <TouchableOpacity
      className="bg-blue-500 rounded-lg py-3 mt-4"
      onPress={closeModal}
      accessibilityRole="button"
      accessibilityLabel="Close trait details"
    >
      <Text className="text-white text-center font-medium">Got it!</Text>
    </TouchableOpacity>
  );

  const TraitModal = () => {
    if (!selectedTrait) return null;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        accessibilityViewIsModal={true}
      >
        <Pressable
          className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4"
          onPress={closeModal}
          accessibilityRole="button"
          accessibilityLabel="Close trait details"
        >
          <Pressable
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View
                  className={`px-3 py-1 rounded-full mr-3 ${
                    selectedTrait.type === 'positive' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <Text className="text-white text-sm font-medium">{selectedTrait.name}</Text>
                </View>
                <Text className="text-lg">{selectedTrait.type === 'positive' ? '✨' : '⚠️'}</Text>
              </View>
              <TouchableOpacity
                onPress={closeModal}
                className="p-2"
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text className="text-gray-500 text-xl font-bold">×</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="max-h-64">
              <Text className="text-gray-800 text-base leading-6 mb-4">
                {selectedTrait.description}
              </Text>

              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-sm font-semibold text-gray-700 mb-1">Effects:</Text>
                <Text className="text-sm text-gray-600">{selectedTrait.effects}</Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 mt-4"
              onPress={closeModal}
              accessibilityRole="button"
              accessibilityLabel="Close trait details"
            >
              <Text className="text-white text-center font-medium">Got it!</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const { positive = [], negative = [], hidden = [] } = traits;
  const hasAnyTraits = positive.length > 0 || negative.length > 0 || hidden.length > 0;

  return (
    <View className="bg-white rounded-xl p-6 shadow-sm">
      {/* Header */}
      <LinearGradient colors={['#8B5CF6', '#7C3AED']} className="p-4 rounded-lg mb-6">
        <Text className="text-xl font-bold text-white text-center">{horseName}'s Traits</Text>
        <Text className="text-purple-100 text-center text-sm mt-1">
          Epigenetic characteristics that shape behavior
        </Text>
      </LinearGradient>

      {/* Traits sections */}
      {hasAnyTraits ? (
        <View>
          <TraitSection title="Positive Traits" traits={positive} type="positive" icon="✨" />

          <TraitSection title="Negative Traits" traits={negative} type="negative" icon="⚠️" />

          <HiddenTraitsSection hiddenTraits={hidden} />
        </View>
      ) : (
        <View className="py-8">
          <Text className="text-center text-gray-500 text-lg">🧬</Text>
          <Text className="text-center text-gray-600 mt-2">No traits discovered yet</Text>
          <Text className="text-center text-gray-500 text-sm mt-1">
            Traits will be revealed as you interact with your horse
          </Text>
        </View>
      )}

      {/* Modal */}
      <TraitModal />
    </View>
  );
};

export default TraitDisplay;
