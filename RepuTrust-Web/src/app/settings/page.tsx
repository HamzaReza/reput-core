import Header from '@/components/common/Header';

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-color-secondary mb-8">Settings</h1>

          <div className="space-y-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-lg border border-color-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-color-secondary mb-4">Profile Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-color-secondary mb-2">
                    Profile Visibility
                  </label>
                  <select className="w-full px-4 py-2 border border-color-border rounded-lg focus:outline-none focus:ring-2 focus:ring-color-primary">
                    <option>Public</option>
                    <option>Private</option>
                    <option>Limited</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-lg border border-color-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-color-secondary mb-4">Privacy Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-color-foreground">Allow email notifications</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-color-foreground">Allow profile in search results</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-color-foreground">Share analytics with RepuTrust</span>
                </label>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-lg border border-color-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-color-secondary mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-color-foreground">Score changes</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-color-foreground">Meeting requests</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-color-foreground">Document verification updates</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button className="px-6 py-2 bg-color-primary text-white font-bold rounded-lg hover:bg-color-primary-dark transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
