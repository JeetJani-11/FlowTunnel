import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AccountState {
  exists: boolean;
}

const initialState: AccountState = {
  exists: false,
};

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    setAccount: (state, action: PayloadAction<Partial<AccountState>>) => {
      Object.assign(state, action.payload, { exists: true });
    },
    unsetAccount: (): AccountState => {
      return { exists: false };
    },
  },
});

export const { setAccount, unsetAccount } = accountSlice.actions;
export default accountSlice.reducer;
