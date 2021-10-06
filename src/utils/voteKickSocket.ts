export interface KickUser {
  vote: boolean;
  userId: string;
}

const usersForKick: Array<KickUser> = [];

export function addToKick(vote: boolean, userId: string) {
  usersForKick.push({ vote, userId });
  return usersForKick;
}

// export function countVotes(userId: string) {
//   usersForKick.push({ vote, userId });
//   return usersForKick;
// }

export function removeUserFromKickArray(userId: string) {
  usersForKick.forEach((user, index) => {
    if (user.userId === userId) {
      usersForKick.splice(index, 1);
    }
  });
}

export function isKick(userId: string) {
  let kick = 0;
  let dontKick = 0;
  usersForKick.forEach((user) => {
    if (user.userId === userId) {
      if (user.vote === true) kick++;
      dontKick++;
    }
  });
  removeUserFromKickArray(userId);
  return kick > dontKick;
}
