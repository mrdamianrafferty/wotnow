
  return (
    <>
      <SEO
        title="Catch Log"
        description="Quick log your catches and track your fishing journey"
        url="https://fishfindr.eu/findr/log"
      />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 pb-16">
        <FindrNavigation />

        {/* Auth Banner */}
        {isAuthenticated === false && (
          <div className="container mx-auto px-4 pt-4 max-w-6xl">
            <div className="alert alert-warning shadow-lg">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h3 className="font-bold">Sign in to save catches</h3>
                <p className="text-sm">Create an account to log catches and build your trophy gallery.</p>
              </div>
              <Link href="/findr/auth" className="btn btn-sm btn-primary">
                Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Sticky Compact Header */}
        <div className="sticky top-0 z-30 bg-base-100/95 backdrop-blur-sm border-b border-base-300 shadow-sm">
          <div className="container mx-auto px-4 py-3 max-w-6xl">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Title and Stats */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ClipboardList className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold truncate">{userName}&apos;s Catch Log</h1>
                  <div className="flex items-center gap-3 text-xs text-base-content/70">
                    <span className="flex items-center gap-1">
                      <Fish className="w-3 h-3" />
                      {catches.length} catches
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {totalSpeciesCaught} species
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Log Button */}
              <span onClick={() => setShowQuickLogModal(true)} className="flex-shrink-0">
                <QuickLogButton />
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pt-6 max-w-6xl">

          {/* Recent Catches Widget */}
          <div className="mt-6">
            <RecentCatchesWidget />
          </div>

          {/* Main Content Card */}
          <div className="card bg-base-100 shadow-xl mt-6">
            <div className="card-body space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Your Catch History</h2>
              </div>

              {/* Catch History Display */}
              {isLoadingCatches ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              ) : catches.length === 0 ? (
                <EmptyState onQuickLog={() => setShowQuickLogModal(true)} />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{catches.length} Total Catches</h3>
                    <Link href="/findr/my-catches" className="btn btn-outline btn-sm gap-2">
                      <Camera className="w-4 h-4" />
                      View Trophy Gallery
                    </Link>
                  </div>
                  <CatchHistoryDisplay catches={catches} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Button (shows after 3 catches) */}
        {catches.length > 3 && isAuthenticated && (
          <button
            onClick={() => setShowQuickLogModal(true)}
            className="btn btn-circle btn-secondary btn-lg shadow-xl fixed bottom-20 right-4 z-40"
            title="Quick Log"
          >
            <Zap className="w-6 h-6" />
          </button>
        )}

        {/* Quick Log Modal */}
        {showQuickLogModal && (
          <QuickLogModal
            isOpen={showQuickLogModal}
            onClose={() => setShowQuickLogModal(false)}
            onQuickLog={quickCatchLog.quickLog}
            onSuccess={handleQuickLogSuccess}
          />
        )}

        {/* Toast Notification */}
        {showToast && (
          <div className="toast toast-top toast-center z-50">
            <div className="alert alert-success">
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
