const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="agri-empty-state flex flex-col items-center justify-center px-6 py-16 text-center">
    {Icon && (
      <div className="agri-empty-state__icon mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.6rem]">
        <Icon size={34} strokeWidth={1.5} />
      </div>
    )}
    <h3 className="text-lg font-semibold tracking-tight text-[#26382a]">{title}</h3>
    {description && <p className="mt-2 mb-5 max-w-md text-sm leading-6 text-[#7a8074]">{description}</p>}
    {action}
  </div>
);

export default EmptyState;
