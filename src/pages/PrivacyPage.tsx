import { useNavigate } from "react-router-dom";
import { ArrowLeft, Languages } from "lucide-react";
import { BrandLogo } from "../components/brand-logo";
import { useApp } from "../lib/store";

export default function PrivacyPage() {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useApp();
  
  // Use French if language is 'fr', else default to English
  const isFr = language === "fr";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
            aria-label={isFr ? "Retour" : "Go back"}
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <BrandLogo className="text-xl font-bold tracking-tight font-geometric" />
        </div>
        
        <button
          onClick={toggleLanguage}
          className="glass rounded-xl px-2.5 py-2 transition-all duration-200 hover:bg-secondary/50 active:scale-95 flex items-center gap-1.5"
          aria-label={isFr ? "Changer de langue" : "Toggle language"}
        >
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground uppercase">
            {language}
          </span>
        </button>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 pt-8 pb-16">
        <div className="glass rounded-3xl p-6 md:p-10 border border-white/5 space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {isFr ? "Politique de Confidentialité" : "Privacy Policy"}
            </h1>
          </div>

          <div className="prose prose-invert prose-p:text-muted-foreground prose-headings:text-foreground prose-a:text-primary max-w-none">
            
            {isFr ? (
              <>
                <p>
                  Nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">1. Les données que nous collectons</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Images téléchargées (ordonnances ou documents)</li>
                  <li>Données extraites (médicaments, dates, emplois du temps)</li>
                  <li>Informations de compte (e-mail, données de connexion)</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">2. Comment nous utilisons les données</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Pour traiter et analyser les documents téléchargés à l'aide de l'IA</li>
                  <li>Pour générer des emplois du temps et des rappels</li>
                  <li>Pour améliorer l'expérience de l'application</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">3. Stockage des données</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Toutes les données sont stockées de manière sécurisée sur des serveurs basés dans l'UE</li>
                  <li>Les données sont cryptées en transit et au repos</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">4. Droits des utilisateurs</h2>
                <p>Vous avez le droit de :</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Accéder à vos données</li>
                  <li>Demander la suppression de vos données</li>
                  <li>Demander la correction de données inexactes</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">5. Sécurité des données</h2>
                <p>
                  Nous mettons en œuvre l'authentification, l'autorisation et le cryptage pour protéger vos données.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">6. Contact</h2>
                <p>
                  Pour toute demande relative à la confidentialité, veuillez contacter : privacy@iqxo.ai
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">7. Mises à jour</h2>
                <p>
                  Nous pouvons mettre à jour cette politique. Les utilisateurs seront informés des changements importants.
                </p>
              </>
            ) : (
              <>
                <p>
                  We respect your privacy and are committed to protecting your personal data.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">1. Data We Collect</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Uploaded images (prescriptions or documents)</li>
                  <li>Extracted data (medications, dates, schedules)</li>
                  <li>Account information (email, login data)</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Data</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>To process and analyze uploaded documents using AI</li>
                  <li>To generate schedules and reminders</li>
                  <li>To improve the application experience</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">3. Data Storage</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>All data is securely stored on EU-based servers</li>
                  <li>Data is encrypted in transit and at rest</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">4. User Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Access your data</li>
                  <li>Request deletion of your data</li>
                  <li>Request correction of inaccurate data</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Security</h2>
                <p>
                  We implement authentication, authorization, and encryption to protect your data.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">6. Contact</h2>
                <p>
                  For any privacy-related requests, please contact: privacy@iqxo.ai
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">7. Updates</h2>
                <p>
                  We may update this policy. Users will be notified of significant changes.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
