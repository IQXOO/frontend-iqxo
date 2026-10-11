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
                  <li>Images téléchargées (texte imprimé, emplois du temps ou documents)</li>
                  <li>Données extraites (dates, tâches, emplois du temps et informations textuelles)</li>
                  <li>Informations de compte (e-mail, données de connexion)</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">2. Comment nous utilisons les données</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Pour traiter et analyser les documents téléchargés à l'aide de l'IA</li>
                  <li>Pour générer des emplois du temps et des rappels</li>
                  <li>Pour améliorer l'expérience de l'application</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">3. Données des API Google et Intégration d'Agendas</h2>
                <p>
                  Lorsque vous connectez votre compte Google Agenda à IQXO, notre application accède à vos données d'agenda via les API Google (notamment <code>https://www.googleapis.com/auth/calendar.readonly</code> et <code>https://www.googleapis.com/auth/calendar.events</code>).
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-2">
                  <li><strong>Données collectées :</strong> Titres des événements, dates et heures de début et fin, descriptions, lieux et identifiants des événements.</li>
                  <li><strong>Finalité de l'utilisation :</strong> Nous utilisons ces données exclusivement pour synchroniser vos emplois du temps, afficher vos événements dans IQXO, détecter les conflits d'horaires et vous permettre de créer ou supprimer des événements selon vos instructions.</li>
                </ul>

                <h3 className="text-lg font-medium mt-6 mb-2">Partage, transfert et divulgation des données utilisateur Google</h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li><strong>Aucun partage avec des tiers :</strong> Nous ne partageons, ne transférons, ne vendons et ne divulguons pas vos données utilisateur Google à des tiers. Vos données Google sont traitées exclusivement pour vous fournir le service de synchronisation d'agendas dans IQXO.</li>
                  <li><strong>Aucune publicité :</strong> Les données utilisateur Google ne sont jamais utilisées ni transférées à des fins publicitaires, y compris la publicité ciblée ou personnalisée.</li>
                  <li><strong>Aucun entraînement de modèles d'IA :</strong> Nous n'utilisons pas les données utilisateur Google pour entraîner ou affiner des modèles d'intelligence artificielle (IA) ou d'apprentissage automatique (ML) généralistes.</li>
                  <li><strong>Accès humain strictement restreint :</strong> Aucun humain ne consulte vos données d'agenda Google, sauf accord explicite de votre part à des fins d'assistance technique, pour des raisons de sécurité ou pour se conformer à une obligation légale.</li>
                </ul>

                <h3 className="text-lg font-medium mt-6 mb-2">Conformité aux règles d'utilisation limitée de Google</h3>
                <p>
                  L'utilisation et le transfert par IQXO à toute autre application des informations reçues des API Google respectent les <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Règles relatives aux données utilisateur des services d'API Google</a>, y compris les exigences d'utilisation limitée (Limited Use requirements).
                </p>

                <h3 className="text-lg font-medium mt-6 mb-2">Révocation et suppression des données</h3>
                <p>
                  Vous pouvez révoquer l'accès d'IQXO à votre compte Google à tout moment depuis l'application dans la section « Connecter les agendas » ou directement depuis les paramètres de votre compte Google (<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Autorisations Google</a>). Lors de la déconnexion, vos jetons d'accès et vos événements synchronisés sont immédiatement supprimés de nos serveurs.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">4. Stockage des données</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Toutes les données sont stockées de manière sécurisée sur des serveurs basés dans l'UE</li>
                  <li>Les données sont cryptées en transit et au repos</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">5. Droits des utilisateurs</h2>
                <p>Vous avez le droit de :</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Accéder à vos données</li>
                  <li>Demander la suppression de vos données</li>
                  <li>Demander la correction de données inexactes</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">6. Sécurité des données</h2>
                <p>
                  Nous mettons en œuvre l'authentification, l'autorisation et le cryptage pour protéger vos données.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">7. Contact</h2>
                <p>
                  Pour toute demande relative à la confidentialité, veuillez contacter : privacy@iqxo.ai
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">8. Mises à jour</h2>
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
                  <li>Uploaded images (printed text, schedules, or documents)</li>
                  <li>Extracted data (dates, tasks, schedules, and text-based info)</li>
                  <li>Account information (email, login data)</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Data</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>To process and analyze uploaded documents using AI</li>
                  <li>To generate schedules and reminders</li>
                  <li>To improve the application experience</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">3. Google API Data & Calendar Integration</h2>
                <p>
                  When you connect your Google Calendar account to IQXO, our application accesses your calendar data via Google APIs (specifically <code>https://www.googleapis.com/auth/calendar.readonly</code> and <code>https://www.googleapis.com/auth/calendar.events</code>).
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-2">
                  <li><strong>Data Accessed:</strong> Calendar event titles, start and end dates/times, event descriptions, locations, and unique event IDs.</li>
                  <li><strong>Purpose of Use:</strong> We access this data strictly to synchronize your schedules, display your events within IQXO, detect scheduling conflicts, and allow you to create or delete calendar events as requested.</li>
                </ul>

                <h3 className="text-lg font-medium mt-6 mb-2">Google User Data Sharing, Transfer, and Disclosure</h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li><strong>No Third-Party Sharing:</strong> We do not share, transfer, sell, or disclose your Google user data to any third parties. Your Google Calendar data is processed exclusively to provide the core synchronization features within IQXO.</li>
                  <li><strong>No Advertising:</strong> Google user data is never used or transferred to serve targeted, personalized, or retargeted advertisements.</li>
                  <li><strong>No AI Model Training:</strong> We do not use Google user data to train, retrain, or fine-tune generalized machine learning (ML) or artificial intelligence (AI) models.</li>
                  <li><strong>Human Access:</strong> No human employees or contractors read your Google user data unless you provide explicit consent for troubleshooting, it is strictly required for security investigations, or to comply with applicable legal requirements.</li>
                </ul>

                <h3 className="text-lg font-medium mt-6 mb-2">Google API Services User Data Policy Compliance</h3>
                <p>
                  IQXO&apos;s use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Google API Services User Data Policy</a>, including the Limited Use requirements.
                </p>

                <h3 className="text-lg font-medium mt-6 mb-2">Data Retention & Revocation</h3>
                <p>
                  You can revoke IQXO&apos;s access to your Google account at any time through our Connected Calendars settings or directly via your Google Account Security page (<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Google Permissions</a>). Upon disconnecting or account deletion, your stored calendar authentication tokens and synced records will be promptly and permanently deleted from our systems.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Storage</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>All data is securely stored on EU-based servers</li>
                  <li>Data is encrypted in transit and at rest</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">5. User Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Access your data</li>
                  <li>Request deletion of your data</li>
                  <li>Request correction of inaccurate data</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">6. Data Security</h2>
                <p>
                  We implement authentication, authorization, and encryption to protect your data.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">7. Contact</h2>
                <p>
                  For any privacy-related requests, please contact: privacy@iqxo.ai
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">8. Updates</h2>
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
