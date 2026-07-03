export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="h-8 w-48 bg-slate-200 rounded-md mb-2"></div>
                    <div className="h-4 w-64 bg-slate-100 rounded-md"></div>
                </div>
                <div className="flex items-center gap-4">
                    {/* TimeFilter Skeleton */}
                    <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
                    {/* Export Button Skeleton */}
                    <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
                </div>
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start">
                        <div className="w-full">
                            <div className="h-3 w-24 bg-slate-200 rounded-md mb-3"></div>
                            <div className="h-8 w-32 bg-slate-200 rounded-md mb-3"></div>
                            <div className="h-3 w-40 bg-slate-100 rounded-md"></div>
                        </div>
                        <div className="h-12 w-12 bg-slate-100 rounded-lg shrink-0 ml-4"></div>
                    </div>
                ))}
            </div>

            {/* Chart Skeleton */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="h-6 w-48 bg-slate-200 rounded-md mb-6"></div>
                <div className="h-80 w-full bg-slate-50 rounded-lg border-2 border-dashed border-slate-100 flex items-center justify-center">
                    <div className="h-full w-full flex flex-col justify-end p-4 gap-2">
                        {/* Fake chart bars/lines using skeleton */}
                        <div className="w-full h-3/4 bg-slate-200/50 rounded-t-sm"></div>
                    </div>
                </div>
            </div>

            {/* Tables Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[1, 2].map((tableIndex) => (
                    <div key={tableIndex} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-slate-100 rounded-lg"></div>
                                <div className="h-6 w-36 bg-slate-200 rounded-md"></div>
                            </div>
                        </div>
                        <div className="p-6">
                            {/* Table Rows Skeleton */}
                            <div className="space-y-6">
                                {[1, 2, 3, 4].map((rowIndex) => (
                                    <div key={rowIndex} className="flex justify-between items-center">
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
                                            <div className="h-3 w-20 bg-slate-100 rounded-md"></div>
                                        </div>
                                        <div className="h-4 w-16 bg-slate-200 rounded-md"></div>
                                        <div className="h-4 w-24 bg-slate-100 rounded-md"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
