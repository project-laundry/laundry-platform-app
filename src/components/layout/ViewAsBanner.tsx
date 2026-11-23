import { getViewer } from '@/lib/auth/view-as';
import { stopViewAsAction } from '@/app/admin/view-as/actions';

/**
 * The pill an admin sees while looking at a customer's or cleaner's pages
 * («Se som»). Renders nothing for everyone else.
 */
export async function ViewAsBanner() {
  const viewer = await getViewer();
  if (!viewer?.viewAs) return null;

  const roleLabel = viewer.dbUser.role === 'cleaner' ? 'renser' : 'kunde';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <form
        action={stopViewAsAction}
        className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-nordic-blue py-2 pl-5 pr-2 text-sm text-white shadow-soft"
      >
        <span className="min-w-0 truncate">
          Du ser som <strong className="font-semibold">{viewer.dbUser.full_name}</strong> ({roleLabel}) · kun visning
        </span>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-white px-4 py-1.5 font-medium text-nordic-blue transition-all hover:brightness-95 active:scale-[0.98]"
        >
          Avslutt
        </button>
      </form>
    </div>
  );
}
