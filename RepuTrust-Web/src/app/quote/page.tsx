import Header from '@/components/common/Header';

export default function QuotePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-color-secondary mb-2">Get a Quote</h1>
          <p className="text-color-muted mb-8">
            Request a quote for our reputation management services
          </p>

          <div className="bg-white rounded-lg border border-color-border p-8 shadow-sm">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-color-secondary mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-color-border rounded-lg focus:outline-none focus:ring-2 focus:ring-color-primary"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-color-secondary mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-color-border rounded-lg focus:outline-none focus:ring-2 focus:ring-color-primary"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-color-secondary mb-2">
                  Service Type
                </label>
                <select className="w-full px-4 py-2 border border-color-border rounded-lg focus:outline-none focus:ring-2 focus:ring-color-primary">
                  <option>Select a service</option>
                  <option>Identity Verification</option>
                  <option>Reputation Audit</option>
                  <option>Document Verification</option>
                  <option>Premium Scoring</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-color-secondary mb-2">
                  Additional Information
                </label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-2 border border-color-border rounded-lg focus:outline-none focus:ring-2 focus:ring-color-primary"
                  placeholder="Tell us more about your needs..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-color-primary text-white font-bold py-3 rounded-lg hover:bg-color-primary-dark transition-colors"
              >
                Submit Quote Request
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
