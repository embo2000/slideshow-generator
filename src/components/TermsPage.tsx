import React from "react";

const TermsPage: React.FC = () => {
  const effectiveDate = "April 6, 2026";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white border rounded-xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
        <p className="text-sm text-gray-500 mt-2">Effective date: {effectiveDate}</p>

        <div className="mt-8 space-y-6 text-sm text-gray-700 leading-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By using this slideshow application, you agree to these Terms and Conditions. If
              you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Use of Service</h2>
            <p className="mt-2">
              You may use this service to upload media, organize slideshows, and generate videos
              for lawful personal or business purposes. You are responsible for all content you
              upload and share.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. User Content</h2>
            <p className="mt-2">
              You retain ownership of your content. By uploading content, you grant us permission
              to store and process it solely to provide the slideshow features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Prohibited Content</h2>
            <p className="mt-2">
              You agree not to upload content that is illegal, infringing, harmful, or violates
              third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Availability</h2>
            <p className="mt-2">
              We may update, suspend, or discontinue parts of the service at any time without
              notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Limitation of Liability</h2>
            <p className="mt-2">
              The service is provided as-is. To the maximum extent permitted by law, we are not
              liable for any indirect or consequential damages resulting from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate access if these terms are violated or misuse is detected.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Changes to Terms</h2>
            <p className="mt-2">
              We may revise these terms from time to time. Continued use after updates means you
              accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact the service administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
