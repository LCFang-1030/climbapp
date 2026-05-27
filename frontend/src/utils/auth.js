export const STAFF_AUTH_STORAGE_KEY = 'staffAuth'

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

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STAFF_AUTH_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed?.isLoggedIn) {
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to parse stored auth payload', error)
    return null
  }
}

export function setStoredAuth(auth) {
  localStorage.setItem(STAFF_AUTH_STORAGE_KEY, JSON.stringify(auth))
  localStorage.setItem('islogin', 'true')
}

export function clearStoredAuth() {
  localStorage.removeItem(STAFF_AUTH_STORAGE_KEY)
  localStorage.removeItem('islogin')
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
