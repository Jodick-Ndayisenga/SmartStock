import * as Crypto from 'expo-crypto';

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256, // <-- must be Crypto.CryptoDigestAlgorithm
      password
    );
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
};
