export const avatarOptions = Array.from(
  { length: 16 },
  (_, index) => `/avatars/avatar-${String(index).padStart(2, '0')}.webp`,
);

export const defaultAvatar = avatarOptions[3];
