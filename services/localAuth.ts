// ─────────────────────────────────────────────────────────────
// services/localAuthService.ts
// Handles local user authentication & profile management
// ─────────────────────────────────────────────────────────────

import database from '@/database'
import { Membership } from '@/database/models/Membership'
import { Shop } from '@/database/models/Shop'
import { User } from '@/database/models/User'
import { hashPassword, verifyPassword } from "@/utils/hashPwd"
import { generateOtp } from '@/utils/otp'
import { Q } from '@nozbe/watermelondb'
import uuid from 'react-native-uuid'

const users = database.get<User>('users')
const memberships = database.get<Membership>('memberships')
const shops = database.get<Shop>('shops')



// ___ interfaces ____________________
export type LoginStatus =
  | 'success'
  | 'user_not_found'
  | 'invalid_password'
  | 'error'

export interface LoginResult {
  status: LoginStatus
  firebaseUid?: string
  user?: User
  memberships?: Membership[]
  shops?: Shop[]
  error?: any
}

// ─── Helper: Enhanced UUID ──────────────────────────────────
const generateEnhancedUUID = (): string => {
  const timestamp = Date.now().toString(36)
  return `${timestamp}-${uuid.v4()}`
}

// ─────────────────────────────────────────────────────────────
// CREATE: Register new user (owner or staff)
// ─────────────────────────────────────────────────────────────
export async function registerUser({
  displayName,
  phone,
  password,
}: {
  displayName?: string
  phone?: string
  password?: string
}): Promise<User> {
  try {
    return database.write(async () => {
    const newUser = await users.create(u => {
      u.displayName = displayName
      if (phone) u.phone = phone.trim()
      if (password) u.password = password
      u.firebaseUid = generateEnhancedUUID()
      u.isOwner = true
      u._tableStatus = 'created'
      u._lastSyncChanged = Date.now()
    })
    return newUser
  })
    
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
    
  }
}

// ─────────────────────────────────────────────────────────────
// READ: Get current logged-in user (if stored in app state)
// ─────────────────────────────────────────────────────────────
export async function getUserByEmail(email: string): Promise<User | null> {
  const results = await users.query(Q.where('email', email.toLowerCase())).fetch()
  return results[0] ?? null
}

// ─────────────────────────────────────────────────────────────
// LOGIN BY FIREBASE ID

export async function loginByFirebaseUid(firebaseUid: string): Promise<User> {
  try {
    const userResults = await users.query(Q.where('firebase_uid', firebaseUid)).fetch()
    return userResults[0]
  } catch (error) {
    console.error('Error logging in by Firebase UID:', error);
    throw error;
  }
}
export async function getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
  const results = await users.query(Q.where('firebase_uid', firebaseUid)).fetch()
  return results[0] ?? null
}

// ─────────────────────────────────────────────────────────────
// AUTH: Local login (non-firebase scenario)
// ─────────────────────────────────────────────────────────────


export async function loginUserLocal(
  phone: string,
  password: string
): Promise<LoginResult> {
  try {
    // Helper function to clean phone numbers
    
    const normalizePhone = (p: string) =>
      p.replace(/\D/g, '') // remove all non-digit characters
    

    const normalizedPhone = normalizePhone(phone.trim())
    
    const normalizedPassword = password.trim()

    //  Fetch all users (or limit if many)
    const allUsers = await users.query().fetch()

    // Compare normalized phone numbers
    const user = allUsers.find(
      u => normalizePhone(u.phone) === normalizedPhone
    )

    if (!user) {
      return { status: 'user_not_found' }
    }

    const passwordMatches = await verifyPassword(normalizedPassword, user.password)

    if (!passwordMatches) {
      return { status: 'invalid_password' }
    }

    // Memberships
    const userMemberships = await memberships
      .query(Q.where('user_id', user.id))
      .fetch()

    const shopIds = userMemberships.map(m => m.shopId)
    const userShops = shopIds.length
      ? await shops.query(Q.where('id', Q.oneOf(shopIds))).fetch()
      : []

    return {
      status: 'success',
      user,
      memberships: userMemberships,
      shops: userShops,
    }
  } catch (error) {
    console.error('❌ Local login error:', error)
    return { status: 'error', error }
  }
}


// ─────────────────────────────────────────────────────────────
// AUTH: Logout (you can use async storage clearing in UI)
// ─────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  // You’d typically just clear AsyncStorage / secure store
  // Here we can add local cleanup if needed
  return
}

// ─────────────────────────────────────────────────────────────
// UPDATE: Edit user profile
// ─────────────────────────────────────────────────────────────
export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
  return database.write(async () => {
    const user = await users.find(userId)
    await user.update(u => {
      if (updates.displayName !== undefined) u.displayName = updates.displayName
      if (updates.phone !== undefined) u.phone = updates.phone
      if (updates.email !== undefined) u.email = updates.email.toLowerCase()
      if (updates.password !== undefined) u.password = updates.password
      u._tableStatus = 'updated'
      u._lastSyncChanged = Date.now()
    })
    return user
  })
}

// ─────────────────────────────────────────────────────────────
// READ: Get all users (for admin or debugging)
// ─────────────────────────────────────────────────────────────
export async function getAllUsers(): Promise<User[]> {
  return await users.query().fetch()
}

// ─────────────────────────────────────────────────────────────
// READ: Get all owners / all staff
// ─────────────────────────────────────────────────────────────
export async function getOwners(): Promise<User[]> {
  return await users.query(Q.where('is_owner', true)).fetch()
}

export async function getStaff(): Promise<User[]> {
  return await users.query(Q.where('is_owner', false)).fetch()
}

// ─────────────────────────────────────────────────────────────
// DELETE: Soft delete user (mark as deleted)
// ─────────────────────────────────────────────────────────────
export async function deleteUser(userId: string): Promise<void> {
  return database.write(async () => {
    const user = await users.find(userId)
    await user.markAsDeleted()
  })
}

// ─────────────────────────────────────────────────────────────
// SYNC HELPERS
// ─────────────────────────────────────────────────────────────
export async function getUnsyncedUsers(): Promise<User[]> {
  return await users.query(Q.where('_tableStatus', Q.notEq('synced'))).fetch()
}

export async function markUserAsSynced(userId: string): Promise<void> {
  return database.write(async () => {
    const user = await users.find(userId)
    await user.markAsSynced()
  })
}

// ─────────────────────────────────────────────────────────────
// DEBUG: clear all users (use only for testing)
// ─────────────────────────────────────────────────────────────
export async function clearAllUsers(): Promise<void> {
  return database.write(async () => {
    const all = await users.query().fetch()
    await Promise.all(all.map(u => u.destroyPermanently()))
  })
}

export async function getUserByPhone(phone:string){
  try {
    const normalizePhone = (p: string) =>
    p.replace(/\D/g, '') // remove all non-digit characters

    const normalizedPhoneNumber = normalizePhone(phone)

    const allUsers = await users.query().fetch()


    const user = allUsers.find(
    u => normalizePhone(u.phone) === normalizedPhoneNumber
  )

  if (!user) {
    throw new Error('User not found')
  }

  const code = generateOtp(6)

  return { user, code}

    
  } catch (error) {
    console.log(error)
  }
}

export async function changePassword(phoneNumber: string, newPassword: string): Promise<void> {
  const normalizePhone = (p: string) =>
    p.replace(/\D/g, '') // remove all non-digit characters

  const normalizedPhone = normalizePhone(phoneNumber.trim())
  const normalizedNewPassword = await hashPassword(newPassword)

  const allUsers = await users.query().fetch()

  const user = allUsers.find(
    u => normalizePhone(u.phone) === normalizedPhone
  )

  if (!user) {
    throw new Error('User not found')
  }

  return database.write(async () => {
    await user.update(u => {
      u.password = normalizedNewPassword
      u._tableStatus = 'updated'
    })
  })
  
}
