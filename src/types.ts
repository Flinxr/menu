export type CategoryId = string;

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  price: number; // in Tomans
  description: string;
  ingredients?: string[];
  portionDetails?: string;
  tags?: ('popular' | 'economy' | 'special' | 'new' | 'protein')[];
  iconType: 
    | 'egg' 
    | 'bread' 
    | 'cheese' 
    | 'kebab' 
    | 'rice' 
    | 'stew' 
    | 'chicken' 
    | 'pasta' 
    | 'burger' 
    | 'hotdog' 
    | 'sandwich' 
    | 'fries'
    | 'drink'
    | 'coffee'
    | 'dessert'
    | 'salad'
    | 'soup'
    | 'pizza';
  caloriesEstimate?: number;
  preparationTime?: string;
}

export interface CategoryInfo {
  id: string;
  title: string;
  subtitle: string;
  iconName?: string;
  count?: number;
}
