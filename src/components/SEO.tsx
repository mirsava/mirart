import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'ArtZyla';
const DEFAULT_DESCRIPTION = 'Discover unique paintings, woodworking, and handmade art from independent artists. ArtZyla connects talented creators with art lovers worldwide.';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  prevUrl?: string;
  nextUrl?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  structuredData?: object;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  url,
  prevUrl,
  nextUrl,
  type = 'website',
  noindex = false,
  structuredData,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Premium Art Marketplace`;
  const fullUrl = url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : BASE_URL;
  const fullPrevUrl = prevUrl ? (prevUrl.startsWith('http') ? prevUrl : `${BASE_URL}${prevUrl}`) : '';
  const fullNextUrl = nextUrl ? (nextUrl.startsWith('http') ? nextUrl : `${BASE_URL}${nextUrl}`) : '';
  const fullImage = image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      {fullPrevUrl && <link rel="prev" href={fullPrevUrl} />}
      {fullNextUrl && <link rel="next" href={fullNextUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:alt" content={title || SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
