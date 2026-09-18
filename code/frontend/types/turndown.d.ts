declare module "turndown" {
  export interface TurndownOptions {
    headingStyle?: "setext" | "atx";
    [key: string]: unknown;
  }

  export default class TurndownService {
    constructor(options?: TurndownOptions);
    turndown(html: string): string;
  }
}
