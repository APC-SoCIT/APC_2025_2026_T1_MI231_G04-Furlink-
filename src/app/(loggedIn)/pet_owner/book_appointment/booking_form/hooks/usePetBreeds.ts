import { useEffect, useState } from 'react';

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

function buildDogBreedList(apiMessage: Record<string, string[]>): string[] {
  const breeds: string[] = ['Aspin'];
  Object.keys(apiMessage).forEach((mainBreed) => {
    const subBreeds = apiMessage[mainBreed];
    if (subBreeds.length > 0) {
      subBreeds.forEach((sub) => {
        breeds.push(`${sub} ${mainBreed}`.split(' ').map(capitalize).join(' '));
      });
    } else {
      breeds.push(capitalize(mainBreed));
    }
  });
  return breeds.sort();
}

export function usePetBreeds() {
  const [dogBreeds, setDogBreeds] = useState<string[]>([]);
  const [catBreeds, setCatBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState(false);

  useEffect(() => {
    const fetchBreeds = async () => {
      setLoadingBreeds(true);
      try {
        const dogRes = await fetch('https://dog.ceo/api/breeds/list/all');
        const dogData = await dogRes.json();
        if (dogData.status === 'success') {
          setDogBreeds(buildDogBreedList(dogData.message));
        }

        const catRes = await fetch('https://api.thecatapi.com/v1/breeds');
        const catData = await catRes.json();
        if (Array.isArray(catData)) {
          setCatBreeds(['Puspin', ...catData.map((b: { name: string }) => b.name)].sort());
        }
      } catch (err) {
        console.error('Failed to fetch breeds', err);
      } finally {
        setLoadingBreeds(false);
      }
    };
    fetchBreeds();
  }, []);

  return { dogBreeds, catBreeds, loadingBreeds };
}