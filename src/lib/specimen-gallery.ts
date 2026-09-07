import cymaFront from '../assets/cyma-time-o-vox/gallery/cyma-front.jpg';
import cymaSidePushers from '../assets/cyma-time-o-vox/gallery/cyma-side-pushers.jpg';
import cymaLugCloseup from '../assets/cyma-time-o-vox/gallery/cyma-lug-closeup.jpg';
import cymaCasebackInside from '../assets/cyma-time-o-vox/gallery/cyma-caseback-inside.jpg';
import cymaMovementR464 from '../assets/cyma-time-o-vox/gallery/cyma-movement-r464.jpg';

export type SpecimenGalleryItem = {
  image: string | { src: string };
  label?: string;
  alt?: string;
};

export const specimenGalleryBySlug: Record<string, SpecimenGalleryItem[]> = {
  'cyma-time-o-vox': [
    {
      image: cymaFront,
      label: '正面（リストショット）',
      alt: 'CYMA Time-O-Vox 18K Chronomètre 掲載個体 正面 リストショット'
    },
    {
      image: cymaSidePushers,
      label: '側面（2プッシャー）',
      alt: 'CYMA Time-O-Vox 18K Chronomètre 側面 2プッシャーとリューズ'
    },
    {
      image: cymaLugCloseup,
      label: '透かしラグ',
      alt: 'CYMA Time-O-Vox 18K Chronomètre 透かしラグの接写'
    },
    {
      image: cymaCasebackInside,
      label: '裏蓋内側刻印',
      alt: 'CYMA Time-O-Vox 18K Chronomètre 裏蓋内側刻印 18K 0.750 Weber'
    },
    {
      image: cymaMovementR464,
      label: 'ムーブメント（Cal.R.464）',
      alt: 'CYMA Time-O-Vox Cal.R.464 ムーブメント'
    }
  ]
};
