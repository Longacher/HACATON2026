export type RootStackParamList = {
  Home: undefined;
  Submit: { applicantType?: string };
  Result: { trackNumber: string };
  Track: { initialTrack?: string } | undefined;
};

export const linking = {
  prefixes: ["otklik://"],
  config: {
    screens: {
      Home: "",
      Submit: "submit",
      Result: "result",
      Track: "track/:initialTrack",
    },
  },
};

export function trackLink(trackNumber: string): string {
  return `otklik://track/${encodeURIComponent(trackNumber)}`;
}
