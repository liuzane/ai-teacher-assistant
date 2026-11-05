import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface UserInfo {
  id: string
  username: string
  email?: string
  role?: string
  phone?: string
  menus?: string[]
}

export interface UserState {
  userInfo: UserInfo | null
}

const initialState: UserState = {
  userInfo: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserInfo>) {
      state.userInfo = action.payload
    },
    clearUser(state) {
      state.userInfo = null
    },
  },
})

export const { setUser, clearUser } = userSlice.actions

export default userSlice.reducer