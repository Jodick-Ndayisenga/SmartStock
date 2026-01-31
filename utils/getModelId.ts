import uuid from 'react-native-uuid'

export const generateEnhancedUUID = (): string => {
  const timestamp = Date.now().toString(36)
  return `${timestamp}-${uuid.v4()}`
}