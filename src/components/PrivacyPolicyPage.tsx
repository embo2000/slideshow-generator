import React from "react";

const PrivacyPolicyPage: React.FC = () => {
  const effectiveDate = "April 6, 2026";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white border rounded-xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-2">Effective date: {effectiveDate}</p>

        <div className="mt-8 space-y-6 text-sm text-gray-700 leading-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Information We Collect</h2>
            <p className="mt-2">
              We collect account/profile information from sign-in providers, files you upload
              (images, audio, generated videos), and basic usage data required to run the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. How We Use Information</h2>
            <p className="mt-2">
              Your information is used to provide core features such as slideshow management,
              media storage, and video generation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Storage and Processing</h2>
            <p className="mt-2">
              Uploaded files may be stored in third-party object storage (such as S3-compatible
              services), and slideshow metadata may be stored in a database.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Sharing</h2>
            <p className="mt-2">
              We do not sell your personal data. Data is shared only with service providers needed
              to operate the platform (for example, hosting and storage services).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Data Retention</h2>
            <p className="mt-2">
              We retain uploaded content and metadata as long as needed to provide the service or
              until data is deleted by you or an administrator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Security</h2>
            <p className="mt-2">
              We use reasonable safeguards to protect data, but no method of transmission or
              storage is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Your Choices</h2>
            <p className="mt-2">
              You can manage or remove content through the app features where available. You may
              also contact the administrator for assistance with data requests.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Children&apos;s Privacy</h2>
            <p className="mt-2">
              This service is not intended for direct use by children without adult supervision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this policy periodically. Continued use after updates indicates
              acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Contact</h2>
            <p className="mt-2">
              For privacy-related requests, contact the service administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
