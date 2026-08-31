import React from 'react';
import { 
  Egg, 
  UtensilsCrossed, 
  Beef, 
  Flame, 
  Sandwich, 
  Drumstick, 
  Soup, 
  Coffee, 
  Sparkles,
  Wheat,
  Pizza,
  GlassWater,
  Cake,
  Salad,
  Utensils
} from 'lucide-react';
import { MenuItem } from '../types';

interface MenuIconProps {
  type?: MenuItem['iconType'] | 'category-breakfast' | 'category-iranian' | 'category-fastfood' | string;
  className?: string;
  size?: number;
}

export const MenuIcon: React.FC<MenuIconProps> = ({ type, className = "w-5 h-5", size = 20 }) => {
  switch (type) {
    case 'egg':
      return <Egg size={size} className={className} />;
    case 'bread':
      return <Wheat size={size} className={className} />;
    case 'cheese':
      return <Pizza size={size} className={className} />;
    case 'kebab':
      return <UtensilsCrossed size={size} className={className} />;
    case 'chicken':
      return <Drumstick size={size} className={className} />;
    case 'rice':
    case 'stew':
    case 'soup':
      return <Soup size={size} className={className} />;
    case 'pasta':
      return <UtensilsCrossed size={size} className={className} />;
    case 'burger':
      return <Beef size={size} className={className} />;
    case 'hotdog':
    case 'sandwich':
      return <Sandwich size={size} className={className} />;
    case 'fries':
      return <Flame size={size} className={className} />;
    case 'drink':
      return <GlassWater size={size} className={className} />;
    case 'coffee':
      return <Coffee size={size} className={className} />;
    case 'dessert':
      return <Cake size={size} className={className} />;
    case 'salad':
      return <Salad size={size} className={className} />;
    case 'pizza':
      return <Pizza size={size} className={className} />;
    case 'category-breakfast':
      return <Coffee size={size} className={className} />;
    case 'category-iranian':
      return <UtensilsCrossed size={size} className={className} />;
    case 'category-fastfood':
      return <Flame size={size} className={className} />;
    default:
      return <Utensils size={size} className={className} />;
  }
};

