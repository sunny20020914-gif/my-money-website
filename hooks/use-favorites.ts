"use client"

import { useState, useEffect } from 'react';

export type FavoriteType = 'company' | 'article';

export function useFavorites() {
  const [favorites, setFavorites] = useState<{ companies: string[]; articles: string[] }>({
    companies: [],
    articles: [],
  });

  useEffect(() => {
    const stored = localStorage.getItem('mymoneyweb_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse favorites', e);
      }
    }
  }, []);

  const toggleFavorite = (id: string, type: FavoriteType) => {
    const key = type === 'company' ? 'companies' : 'articles';
    const isFavorited = favorites[key].includes(id);
    
    const newFavorites = { ...favorites };
    if (isFavorited) {
      newFavorites[key] = newFavorites[key].filter(favId => favId !== id);
    } else {
      newFavorites[key] = [...newFavorites[key], id];
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('mymoneyweb_favorites', JSON.stringify(newFavorites));
    return !isFavorited; // 追加された場合はtrue、削除された場合はfalse
  };

  const isFavorite = (id: string, type: FavoriteType) => {
    const key = type === 'company' ? 'companies' : 'articles';
    return favorites[key].includes(id);
  };

  return { favorites, toggleFavorite, isFavorite };
}