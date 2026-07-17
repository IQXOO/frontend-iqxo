import { useNavigate } from "react-router-dom";
import { ArrowLeft, Languages } from "lucide-react";
import { BrandLogo } from "../components/brand-logo";
import { useApp } from "../lib/store";

export default function TermsPage() {
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
              {isFr ? "Conditions Générales" : "Terms and Conditions"}
            </h1>
            <p className="text-muted-foreground">
              {isFr ? "Dernière mise à jour : 15 juillet 2026" : "Last updated: July 15, 2026"}
            </p>
          </div>

          <div className="prose prose-invert prose-p:text-muted-foreground prose-headings:text-foreground prose-a:text-primary max-w-none">
            
            {isFr ? (
              <>
                <p>
                  Ces Conditions d'utilisation (« Conditions ») régissent votre accès et votre utilisation de l'application IQXO, de son site web et des services connexes (collectivement, le « Service »).
                </p>
                <p>
                  En accédant ou en utilisant le Service, vous acceptez d'être lié par ces Conditions. Si vous n'acceptez pas ces Conditions, n'utilisez pas le Service.
                </p>

                <hr className="border-white/10 my-8" />

                <h2 className="text-xl font-semibold mt-8 mb-4">1. Informations sur l'entreprise</h2>
                <p>
                  IQXO<br />
                  E-mail : privacy@iqxo.ai
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">2. Éligibilité</h2>
                <p>
                  Vous devez avoir au moins 13 ans pour utiliser le Service.<br />
                  Si vous avez moins de 18 ans, vous ne pouvez utiliser le Service qu'avec le consentement d'un parent ou d'un tuteur légal.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">3. Comptes et sécurité</h2>
                <p>
                  Vous êtes responsable du maintien de la confidentialité de vos identifiants de compte.<br />
                  Vous acceptez de nous informer immédiatement de tout accès non autorisé.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">4. Le Service</h2>
                <p>
                  IQXO est un assistant alimenté par l'IA conçu pour aider les utilisateurs à organiser leur vie quotidienne, y compris :
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>L'extraction d'informations à partir d'images et de documents (tels que des emplois du temps, des tâches et du texte imprimé)</li>
                  <li>La gestion des rappels et des emplois du temps</li>
                  <li>L'organisation des tâches et des événements</li>
                </ul>
                <p className="mt-4">Les fonctionnalités peuvent évoluer avec le temps.</p>

                <h2 className="text-xl font-semibold mt-8 mb-4">5. Contenu utilisateur</h2>
                <p>
                  Vous pouvez télécharger du contenu tel que des images, des documents ou du texte (« Contenu Utilisateur »).
                </p>
                <p>
                  Vous conservez la propriété de votre contenu.<br />
                  Vous accordez à IQXO une licence limitée pour traiter ces données uniquement dans le but de fournir et d'améliorer le Service.
                </p>
                <p>
                  Vous acceptez de ne pas télécharger de contenu illégal, nuisible ou contrefaisant.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">6. Résultats de l'IA et précision</h2>
                <p>
                  Le Service utilise l'intelligence artificielle pour générer des résultats.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Les résultats peuvent ne pas toujours être exacts ou complets.</li>
                  <li>Vous êtes responsable de vérifier toute information avant de vous y fier.</li>
                  <li>IQXO ne fournit pas de conseils professionnels, médicaux, financiers ou juridiques. Tout rappel ou planification lié à la santé généré par l'application est uniquement à titre d'information personnelle et ne doit jamais remplacer une consultation médicale professionnelle.</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">7. Utilisation acceptable</h2>
                <p>
                  Vous acceptez de ne pas :
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Utiliser le Service de manière illégale</li>
                  <li>Accéder aux données d'autres utilisateurs</li>
                  <li>Interférer avec les opérations du système</li>
                  <li>Rétro-ingénierier la plateforme</li>
                  <li>Télécharger des contenus nuisibles ou illégaux</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">8. Protection des données</h2>
                <p>
                  Vos données sont traitées conformément à notre Politique de Confidentialité et en conformité avec le RGPD.
                </p>
                <p>Les utilisateurs ont le droit de :</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Accéder à leurs données</li>
                  <li>Demander la suppression</li>
                  <li>Demander une correction</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">9. Abonnements et paiements</h2>
                <p>
                  Certaines fonctionnalités nécessitent un abonnement payant.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Les paiements sont traités de manière sécurisée par des fournisseurs tiers.</li>
                  <li>Les abonnements se renouvellent automatiquement sauf annulation.</li>
                  <li>Les remboursements dépendent des politiques des plateformes (Apple App Store / Google Play / Stripe).</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">10. Propriété intellectuelle</h2>
                <p>
                  Tous les droits liés à IQXO (à l'exclusion du contenu utilisateur) appartiennent à IQXO.<br />
                  Vous ne pouvez pas copier ou réutiliser une partie sans autorisation.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">11. Clause de non-responsabilité</h2>
                <p>
                  Le Service est fourni « tel quel » sans garanties.<br />
                  Nous ne garantissons pas un fonctionnement ininterrompu ou sans erreur.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">12. Limitation de responsabilité</h2>
                <p>
                  Dans toute la mesure permise par la loi, IQXO n'est pas responsable des :
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Dommages indirects ou consécutifs</li>
                  <li>Pertes de données</li>
                  <li>Inexactitudes de l'IA</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">13. Résiliation</h2>
                <p>
                  Nous pouvons suspendre ou résilier votre compte si vous violez ces Conditions.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">14. Droit applicable</h2>
                <p>
                  Ces Conditions sont régies par les lois de la France et de l'Union européenne.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">15. Modifications des Conditions</h2>
                <p>
                  Nous pouvons mettre à jour ces Conditions. L'utilisation continue signifie l'acceptation des mises à jour.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">16. Contact</h2>
                <p>
                  Pour toute question :<br />
                  E-mail : privacy@iqxo.ai
                </p>
              </>
            ) : (
              <>
                <p>
                  These Terms of Service ("Terms") govern your access to and use of the IQXO application, website, and related services (collectively, the "Service").
                </p>
                <p>
                  By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
                </p>

                <hr className="border-white/10 my-8" />

                <h2 className="text-xl font-semibold mt-8 mb-4">1. Company Information</h2>
                <p>
                  IQXO<br />
                  Email: privacy@iqxo.ai
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">2. Eligibility</h2>
                <p>
                  You must be at least 13 years old to use the Service.<br />
                  If you are under 18, you may use the Service only with the consent of a parent or legal guardian.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">3. Accounts and Security</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials.<br />
                  You agree to notify us immediately of any unauthorized access.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">4. The Service</h2>
                <p>
                  IQXO is an AI-powered assistant designed to help users organize their daily life, including:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Extracting information from images and documents (such as schedules, tasks, and printed text)</li>
                  <li>Managing reminders and schedules</li>
                  <li>Organizing tasks and events</li>
                </ul>
                <p className="mt-4">Features may evolve over time.</p>

                <h2 className="text-xl font-semibold mt-8 mb-4">5. User Content</h2>
                <p>
                  You may upload content such as images, documents, or text ("User Content").
                </p>
                <p>
                  You retain ownership of your content.<br />
                  You grant IQXO a limited license to process this data solely to provide and improve the Service.
                </p>
                <p>
                  You agree not to upload unlawful, harmful, or infringing content.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">6. AI Outputs and Accuracy</h2>
                <p>
                  The Service uses artificial intelligence to generate outputs.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Results may not always be accurate or complete.</li>
                  <li>You are responsible for verifying any information before relying on it.</li>
                  <li>IQXO does not provide professional, medical, financial, or legal advice. Any health-related scheduling or reminders generated are for personal informational purposes only and should never replace professional medical consultation.</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">7. Acceptable Use</h2>
                <p>
                  You agree not to:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Use the Service illegally</li>
                  <li>Access other users’ data</li>
                  <li>Interfere with system operations</li>
                  <li>Reverse engineer the platform</li>
                  <li>Upload harmful or illegal content</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">8. Data Protection</h2>
                <p>
                  Your data is processed in accordance with our Privacy Policy and in compliance with GDPR.
                </p>
                <p>Users have the right to:</p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Access their data</li>
                  <li>Request deletion</li>
                  <li>Request correction</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">9. Subscriptions and Payments</h2>
                <p>
                  Some features require a paid subscription.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Payments are securely processed via third-party providers.</li>
                  <li>Subscriptions renew automatically unless canceled.</li>
                  <li>Refunds depend on the platform policies (Apple App Store / Google Play / Stripe).</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">10. Intellectual Property</h2>
                <p>
                  All rights related to IQXO (excluding user content) belong to IQXO.<br />
                  You may not copy or reuse any part without permission.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">11. Disclaimer</h2>
                <p>
                  The Service is provided "as is" without warranties.<br />
                  We do not guarantee uninterrupted or error-free operation.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">12. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, IQXO is not liable for:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Indirect or consequential damages</li>
                  <li>Data loss</li>
                  <li>AI inaccuracies</li>
                </ul>

                <h2 className="text-xl font-semibold mt-8 mb-4">13. Termination</h2>
                <p>
                  We may suspend or terminate your account if you violate these Terms.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">14. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of France and the European Union.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">15. Changes to Terms</h2>
                <p>
                  We may update these Terms. Continued use means acceptance of updates.
                </p>

                <h2 className="text-xl font-semibold mt-8 mb-4">16. Contact</h2>
                <p>
                  For questions:<br />
                  Email: privacy@iqxo.ai
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
