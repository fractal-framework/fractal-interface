export interface IOption {
  optionKey: string;
  count?: number;
  onClick: () => void;
  isSelected?: boolean;
  renderer?: () => JSX.Element;
}

export interface IOptionsList {
  options: IOption[];
  closeOnSelect?: boolean;
  showOptionCount?: boolean;
  showOptionSelected?: boolean;
  namespace?: string;
  titleKey?: string;
}
