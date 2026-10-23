const accessTokenKey = import.meta.env.VITE_ACCESS_TOKEN_KEY
const refreshTokenKey = import.meta.env.VITE_REFRESH_TOKEN_KEY

export const getAccessToken = () => {
    return localStorage.getItem(accessTokenKey)
}

export const setAccessToken = (token) => {
    localStorage.setItem(accessTokenKey, token)
}

export const removeAccessToken = () => { 
    localStorage.removeItem(accessTokenKey)
}

export const getRefreshToken = () => {
    return localStorage.getItem(refreshTokenKey)
}

export const setRefreshToken = (token) => {
    localStorage.setItem(refreshTokenKey, token)
}

export const removeRefreshToken = () => {
    localStorage.removeItem(refreshTokenKey)
}