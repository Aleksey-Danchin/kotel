export {};

declare global {
  namespace PrismaJson {
    // Define a type for a user's profile information.
    type UserProfile = {
      theme: "dark" | "light";
      twitterHandle?: string;
    };
  }
}
