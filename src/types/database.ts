export type Stage = "idea" | "building" | "launched";
export type Category =
  | "AI"
  | "Developer Tool"
  | "Web App"
  | "Mobile"
  | "Community"
  | "Other";
export type ProductStatus =
  | "pending"
  | "live"
  | "hidden"
  | "removed"
  | "rejected";
export type CommentStatus = "live" | "hidden";
export type DemoDayStatus = "upcoming" | "completed";
export type DemoDayProjectStatus = "selected" | "presented" | "cancelled";
export type DemoType = "live_demo" | "feedback_only";
export type DemoLanguage = "farsi" | "english";

export interface Profile {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  builder_id: string;
  name: string;
  tagline: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  category: Category;
  stage: Stage;
  status: ProductStatus;
  week_of: string;
  demo_type: DemoType;
  demo_week: string | null;
  demo_language: DemoLanguage | null;
  problem: string | null;
  audience: string | null;
  created_at: string;
}

export type ProductBuilder = Pick<Profile, "display_name" | "handle" | "avatar_url">;
export type CommentAuthor = Pick<Profile, "display_name" | "handle" | "avatar_url">;

export interface ProductWithCounts extends Product {
  vote_count: number;
  comment_count: number;
  builder: ProductBuilder | string;
  user_has_voted?: boolean;
}

export interface Vote {
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  product_id: string;
  author_id: string;
  body: string;
  status: CommentStatus;
  created_at: string;
  author?: CommentAuthor;
}

export interface DemoDay {
  week_of: string;
  demo_date: string;
  status: DemoDayStatus;
  notes: string | null;
  recording_url: string | null;
}

export interface DemoDayWinner {
  week_of: string;
  rank: number;
  product_id: string;
  vote_count: number;
  product?: ProductWithCounts;
}

export type DemoDayWinnerProduct = Pick<Product, "id" | "name" | "tagline">;

export type DemoDayWinnerWithProduct = Omit<DemoDayWinner, "product"> & {
  product: DemoDayWinnerProduct | null;
};

export interface DemoDayProject {
  week_of: string;
  product_id: string;
  display_order: number;
  status: DemoDayProjectStatus;
  created_at: string;
  product?: ProductWithCounts | null;
}

export type DemoDaySelectedProduct = Pick<
  Product,
  "id" | "name" | "tagline" | "stage" | "category" | "demo_type" | "demo_language"
>;

export type DemoDayProjectWithProduct = Omit<DemoDayProject, "product"> & {
  product: DemoDaySelectedProduct | null;
};
