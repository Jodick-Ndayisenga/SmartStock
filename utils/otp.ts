// utils/otp.ts
export const generateOtp = (length: number = 4): string => {
  let otp = '';

  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }

  return otp;
};
