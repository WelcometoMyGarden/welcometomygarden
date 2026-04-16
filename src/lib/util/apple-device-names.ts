// See https://gist.github.com/th0rgall/a3d3573d536a9dbd1a33d4c768e0dca0
const deviceNamesToIdentifiersMap = {
  iPhone: {
    '5s': ['6,1', '6,2'],
    '6 Plus': ['7,1'],
    '6': ['7,2'],
    '6s': ['8,1'],
    '6s Plus': ['8,2'],
    SE: ['8,4', '12,8', '14,6'],
    '7': ['9,1', '9,3'],
    '7 Plus': ['9,2', '9,4'],
    '8': ['10,1', '10,4'],
    '8 Plus': ['10,2', '10,5'],
    X: ['10,3', '10,6'],
    XS: ['11,2'],
    'XS Max': ['11,4', '11,6'],
    XR: ['11,8'],
    '11': ['12,1'],
    '11 Pro': ['12,3'],
    '11 Pro Max': ['12,5'],
    '12 mini': ['13,1'],
    '12': ['13,2'],
    '12 Pro': ['13,3'],
    '12 Pro Max': ['13,4'],
    '13 Pro': ['14,2'],
    '13 Pro Max': ['14,3'],
    '13 mini': ['14,4'],
    '13': ['14,5'],
    '14': ['14,7'],
    '14 Plus': ['14,8'],
    '14 Pro': ['15,2'],
    '14 Pro Max': ['15,3'],
    '15': ['15,4'],
    '15 Plus': ['15,5'],
    '15 Pro': ['16,1'],
    '15 Pro Max': ['16,2'],
    '16 Pro': ['17,1'],
    '16 Pro Max': ['17,2'],
    '16': ['17,3'],
    '16 Plus': ['17,4'],
    '16e': ['17,5'],
    '17 Pro': ['18,1'],
    '17 Pro Max': ['18,2'],
    '17': ['18,3'],
    Air: ['18,4']
  },
  iPad: {
    '': [
      '6,11',
      '6,12',
      '7,5',
      '7,6',
      '7,11',
      '7,12',
      '11,6',
      '11,7',
      '12,1',
      '12,2',
      '13,18',
      '13,19',
      '15,7',
      '15,8'
    ],
    mini: [
      '4,4',
      '4,5',
      '4,6',
      '4,7',
      '4,8',
      '4,9',
      '5,1',
      '5,2',
      '11,1',
      '11,2',
      '14,1',
      '14,2',
      '16,1',
      '16,2'
    ],
    Air: [
      '4,1',
      '4,2',
      '4,3',
      '5,3',
      '5,4',
      '11,3',
      '11,4',
      '13,1',
      '13,2',
      '13,16',
      '13,17',
      '14,8',
      '14,9',
      '14,10',
      '14,11',
      '15,3',
      '15,4',
      '15,5',
      '15,6'
    ],
    Pro: [
      '6,3',
      '6,4',
      '6,7',
      '6,8',
      '7,1',
      '7,2',
      '7,3',
      '7,4',
      '8,1',
      '8,2',
      '8,3',
      '8,4',
      '8,5',
      '8,6',
      '8,7',
      '8,8',
      '8,9',
      '8,10',
      '8,11',
      '8,12',
      '13,4',
      '13,5',
      '13,6',
      '13,7',
      '13,8',
      '13,9',
      '13,10',
      '13,11',
      '14,3',
      '14,4',
      '14,5',
      '14,6',
      '16,3',
      '16,4',
      '16,5',
      '16,6'
    ]
  }
};

/**
 * Returns the base Apple device name for an iPad or iPhone, given the model identifier.
 * For example: "iPad14,6" -> "iPad Pro"
 */
export function getAppleDeviceModelName(identifier: string): string {
  const match = identifier.match(/^(iPhone|iPad)(\d+,\d+)$/);
  if (!match) return identifier;

  const [, deviceType, identifierSuffix] = match;
  const typeMap = deviceNamesToIdentifiersMap[deviceType as 'iPhone' | 'iPad'];

  if (!typeMap) return deviceType;

  for (const [modelNameSuffix, identifierSuffixes] of Object.entries(typeMap)) {
    if (identifierSuffixes.includes(identifierSuffix)) {
      return modelNameSuffix ? `${deviceType} ${modelNameSuffix}` : deviceType;
    }
  }

  // Best-effort: known device type but unrecognized model
  return deviceType;
}
