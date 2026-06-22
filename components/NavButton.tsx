interface NavButtonProps {
  name: string;
  href: string;
}

export function NavButton({ name, href }: NavButtonProps) {
  return (
    <li className="list-none">
      <a
        href={href}
        className="group flex items-center justify-between px-4 py-3 rounded-xl 
                   text-gray-200 hover:text-white hover:bg-white/10 
                   transition-all duration-200 ease-in-out"
      >
        <div className="flex items-center gap-3">
          {/* 아이콘이 들어갈 자리 (나중에 추가 가능) */}
          <span className="font-medium text-sm md:text-base">{name}</span>
        </div>
      </a>
    </li>
  );
}