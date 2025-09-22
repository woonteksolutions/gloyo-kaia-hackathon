import { useEffect } from 'react';
import { useEnvironmentDetection } from './useEnvironmentDetection';

export function useDappPortalTitle(defaultTitle: string = 'Gloyo Dapp') {
  const { isDappPortal } = useEnvironmentDetection();

  useEffect(() => {
    const titleElement = document.getElementById('page-title') as HTMLTitleElement;
    
    if (isDappPortal) {
      // Follow DappPortal design guide: "Name | Mini Dapp"
      const miniDappTitle = `${defaultTitle} | Mini Dapp`;
      document.title = miniDappTitle;
      if (titleElement) {
        titleElement.textContent = miniDappTitle;
      }
    } else {
      // Use default title for web environment
      const webTitle = `${defaultTitle} - Decentralized Finance Platform`;
      document.title = webTitle;
      if (titleElement) {
        titleElement.textContent = webTitle;
      }
    }
  }, [isDappPortal, defaultTitle]);
}