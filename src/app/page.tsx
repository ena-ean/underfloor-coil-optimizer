import { CalculatorApp } from "@/components/calculator/calculator-app";
import { APP_DESCRIPTION, APP_NAME, LICENSE, REPO_URL } from "@/lib/constants";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  description: APP_DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  license: `https://opensource.org/licenses/${LICENSE}`,
  url: REPO_URL,
};

export default function Home() {
  return (
    <>
      <CalculatorApp />
      <script
        type="application/ld+json"
        // Static, locally defined payload — no user input involved.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
