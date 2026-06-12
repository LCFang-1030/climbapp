export const STAFF_AUTH_STORAGE_KEY = 'staffAuth'
export const STAFF_LOGIN_FLAG_KEY = 'islogin'
export const STAFF_AUTH_IDLE_TIMEOUT_MS = 60 * 60 * 1000

export const BASE_ALLOWED_PERMISSIONS = [
  'home',
  'entry',
  'member',
  'visithistory',
  'items',
  'activity',
  'scheduling',
]

export function isAdminStaff(staff = {}) {
  const employeeId = String(staff.employee_id ?? '')
  const employeeTitle = String(staff.employee_title ?? '')

  return employeeId.startsWith('S') || employeeTitle === '管理人員'
}

export function normalizeAuthPayload(staff = {}) {
  const isAdmin = isAdminStaff(staff)

  return {
    isLoggedIn: true,
    eid: staff.eid ?? null,
    employee_id: staff.employee_id ?? '',
    alias: staff.alias ?? '',
    employee_title: staff.employee_title ?? '',
    isAdmin,
    allowedPermissions: isAdmin ? ['*'] : [...BASE_ALLOWED_PERMISSIONS],
  }
}

export function getNextMidnightTimestamp(baseTimestamp = Date.now()) {
  const nextMidnight = new Date(baseTimestamp)
  nextMidnight.setHours(24, 0, 0, 0)
  return nextMidnight.getTime()
}

function isStoredAuthExpired(auth, now = Date.now()) {
  const lastActiveAt = Number(auth?.lastActiveAt ?? 0)
  const forceLogoutAt = Number(auth?.forceLogoutAt ?? 0)

  if (!lastActiveAt || !forceLogoutAt) {
    return true
  }

  return now - lastActiveAt >= STAFF_AUTH_IDLE_TIMEOUT_MS || now >= forceLogoutAt
}

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STAFF_AUTH_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed?.isLoggedIn) {
      clearStoredAuth()
      return null
    }

    if (isStoredAuthExpired(parsed)) {
      clearStoredAuth()
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to parse stored auth payload', error)
    clearStoredAuth()
    return null
  }
}

export function setStoredAuth(auth) {
  const now = Date.now()
  const nextAuth = {
    ...auth,
    loginAt: now,
    lastActiveAt: now,
    forceLogoutAt: getNextMidnightTimestamp(now),
  }

  localStorage.setItem(STAFF_AUTH_STORAGE_KEY, JSON.stringify(nextAuth))
  localStorage.setItem(STAFF_LOGIN_FLAG_KEY, 'true')
}

export function touchStoredAuthActivity() {
  const auth = getStoredAuth()
  if (!auth) {
    return null
  }

  const nextAuth = {
    ...auth,
    lastActiveAt: Date.now(),
  }

  localStorage.setItem(STAFF_AUTH_STORAGE_KEY, JSON.stringify(nextAuth))
  localStorage.setItem(STAFF_LOGIN_FLAG_KEY, 'true')
  return nextAuth
}

export function clearStoredAuth() {
  localStorage.removeItem(STAFF_AUTH_STORAGE_KEY)
  localStorage.removeItem(STAFF_LOGIN_FLAG_KEY)
}

export function canAccessPermission(auth, permissionKey) {
  if (!permissionKey) {
    return true
  }

  if (!auth?.isLoggedIn) {
    return false
  }

  if (auth.isAdmin) {
    return true
  }

  return Array.isArray(auth.allowedPermissions) && auth.allowedPermissions.includes(permissionKey)
}
