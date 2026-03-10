export function EmptySelectionState({ typeName }: { typeName: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
      <div className="text-slate-400">请选择左侧{typeName}查看详情</div>
    </div>
  );
}
