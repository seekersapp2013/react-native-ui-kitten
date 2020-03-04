/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import React from 'react';
import {
  Animated,
  ImageProps,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TargetedEvent,
  TextStyle,
  View,
  ViewProps,
} from 'react-native';
import { Overwrite } from 'utility-types';
import {
  ChildrenWithProps,
  FalsyFC,
  FalsyText,
  IndexPath,
  RenderProp,
  TouchableWeb,
  TouchableWebElement,
  TouchableWebProps,
} from '../../devsupport';
import {
  Interaction,
  styled,
  StyledComponentProps,
  StyleType,
} from '../../theme';
import { List } from '../list/list.component';
import { Popover } from '../popover/popover.component';
import { ChevronDown } from '../shared/chevronDown.component';
import { SelectGroupProps } from './selectGroup.component';
import {
  SelectItemElement,
  SelectItemProps,
} from './selectItem.component';
import {
  SelectItemDescriptor,
  SelectService,
} from './select.service';

type SelectStyledProps = Overwrite<StyledComponentProps, {
  appearance?: 'default' | string;
}>;

export interface SelectProps extends TouchableWebProps, SelectStyledProps {
  children?: ChildrenWithProps<SelectItemProps | SelectGroupProps>;
  selectedIndex?: IndexPath | IndexPath[];
  onSelect?: (index: IndexPath | IndexPath[]) => void;
  value?: string;
  multiSelect?: boolean;
  placeholder?: RenderProp<TextStyle> | string;
  label?: RenderProp<TextStyle> | string;
  caption?: RenderProp<TextStyle> | string;
  accessoryLeft?: RenderProp<Partial<ImageProps>>;
  accessoryRight?: RenderProp<Partial<ImageProps>>;
  status?: 'basic' | 'primary' | 'success' | 'info' | 'warning' | 'danger' | 'control' | string;
  size?: 'small' | 'medium' | 'large' | string;
}

export type SelectElement = React.ReactElement<SelectProps>;

interface State {
  listVisible: boolean;
}

const CHEVRON_DEG_COLLAPSED: number = -180;
const CHEVRON_DEG_EXPANDED: number = 0;
const CHEVRON_ANIM_DURATION: number = 200;

/**
 * Styled `Select` component. Renders a List of
 *
 * @extends React.Component
 *
 * @method {() => void} show - sets options list visible.
 *
 * @method {() => void} hide - sets options list invisible.
 *
 * @method {() => void} focus - focuses input field and sets options list visible.
 *
 * @method {() => void} blur - removes focus from input field and sets options list invisible.
 *
 * @method {() => boolean} isFocused - whether input field is currently focused and options list is visible.
 *
 * @method {() => void} clear - removes all text from the Select.
 *
 * @property {ReactElement<SelectItemProps> | ReactElement<SelectItemProps>[]} children -
 * items to be rendered within options list.
 *
 * @property {IndexPath | IndexPath[]} selectedIndex - index or array of indices of selected options.
 * IndexPath `{ row: number, section: number | undefined }` - position of element in sectioned list.
 * Select becomes sectioned when SelectGroup is rendered within children.
 *
 * @property {(option: IndexPath | IndexPath[]) => void} onSelect - called when option is pressed.
 * Called with `{ row: number }` by default and for SelectGroup items.
 * Called with { row: number, section: number } for items rendered within SelectGroup.
 *
 * @property {string | (props: TextProps) => ReactElement} value - string or a function component
 * to render for the selected options.
 * By default, calls `toString()` for each index in selectedIndex property.
 * If it is a function, it will be called with props provided by Eva.
 * Otherwise, renders a Text styled by Eva.
 *
 * @property {boolean} multiSelect - whether multiple options can be selected.
 * If true, calls onSelect with IndexPath[] in arguments.
 * Otherwise, with IndexPath in arguments.
 *
 * @property {string | (props: TextProps) => ReactElement} placeholder - string or a function component
 * to render when there is no selected options.
 * If it is a function, it will be called with props provided by Eva.
 * Otherwise, renders a Text styled by Eva.
 *
 * @property {string | (props: TextProps) => ReactElement} label - string or a function component
 * to render to top of the input field.
 * If it is a function, it will be called with props provided by Eva.
 * Otherwise, renders a Text styled by Eva.
 *
 * @property {(props: ImageProps) => ReactElement} accessoryLeft - function component
 * to render to start of the text.
 * Called with props provided by Eva.
 *
 * @property {(props: ImageProps) => ReactElement} accessoryRight - function component
 * to render to end of the text.
 * Called with props provided by Eva.
 *
 * @property {string | (props: TextProps) => ReactElement} caption - string or a function component
 * to render to bottom of the input field.
 * If it is a function, it will be called with props provided by Eva.
 * Otherwise, renders a Text styled by Eva.
 *
 * @property {string} status - status of the component.
 * Can be `basic`, `primary`, `success`, `info`, `warning`, `danger` or `control`.
 * Default is `basic`.
 *
 * @property {string} size - size of the component.
 * Can be `small`, `medium` or `large`.
 * Default is `medium`.
 *
 * @property {() => void} onFocus - called when options list becomes visible.
 *
 * @property {() => void} onBlur - called when options list becomes invisible.
 *
 * @property {TouchableOpacityProps} ...TouchableOpacityProps - any props applied to TouchableOpacity component.
 *
 * @overview-example SelectSimpleUsage
 *
 * @overview-example SelectStates
 *
 * @overview-example SelectStatus
 *
 * @overview-example SelectSize
 *
 * @overview-example SelectMultiSelect
 *
 * @overview-example SelectWithGroups
 *
 * @overview-example SelectDisabledOptions
 *
 * @example SelectInitialValue
 *
 * @example SelectMultiInitialValue
 *
 * @example SelectCustomIcon
 *
 * @example SelectInlineStyling
 */
export class SelectComponent extends React.Component<SelectProps, State> {

  static styledComponentName: string = 'Select';

  static defaultProps = {
    placeholder: 'Select Option',
    selectedIndex: [],
  };

  public state: State = {
    listVisible: false,
  };

  private service: SelectService = new SelectService();
  private popoverRef: React.RefObject<Popover> = React.createRef();
  private expandAnimation: Animated.Value = new Animated.Value(0);

  private get isMultiSelect(): boolean {
    return this.props.multiSelect;
  }

  private get data(): any[] {
    return React.Children.toArray(this.props.children || []);
  }

  private get selectedIndices(): IndexPath[] {
    return Array.isArray(this.props.selectedIndex) ? this.props.selectedIndex : [this.props.selectedIndex];
  }

  private get expandToRotateInterpolation(): Animated.AnimatedInterpolation {
    return this.expandAnimation.interpolate({
      inputRange: [CHEVRON_DEG_COLLAPSED, CHEVRON_DEG_EXPANDED],
      outputRange: [`${CHEVRON_DEG_COLLAPSED}deg`, `${CHEVRON_DEG_EXPANDED}deg`],
    });
  }

  public show = (): void => {
    this.popoverRef.current.show();
  };

  public hide = (): void => {
    this.popoverRef.current.hide();
  };

  public focus = (): void => {
    this.setOptionsListVisible();
  };

  public blur = (): void => {
    this.setOptionsListInvisible();
  };

  public isFocused = (): boolean => {
    return this.state.listVisible;
  };

  public clear = (): void => {
    this.props.onSelect && this.props.onSelect(null);
  };

  private onMouseEnter = (e: NativeSyntheticEvent<TargetedEvent>): void => {
    this.props.eva.dispatch([Interaction.HOVER]);
    this.props.onMouseEnter && this.props.onMouseEnter(e);
  };

  private onMouseLeave = (e: NativeSyntheticEvent<TargetedEvent>): void => {
    this.props.eva.dispatch([]);
    this.props.onMouseLeave && this.props.onMouseLeave(e);
  };

  private onPress = (): void => {
    this.setOptionsListVisible();
  };

  private onPressIn = (): void => {
    this.props.eva.dispatch([Interaction.ACTIVE]);
  };

  private onPressOut = (): void => {
    this.props.eva.dispatch([]);
  };

  private onItemPress = (descriptor: SelectItemDescriptor): void => {
    if (this.props.onSelect) {
      const selectedIndices = this.service.selectItem(this.isMultiSelect, descriptor, this.selectedIndices);
      !this.isMultiSelect && this.setOptionsListInvisible();

      this.props.onSelect && this.props.onSelect(selectedIndices);
    }
  };

  private onBackdropPress = (): void => {
    this.setOptionsListInvisible();
  };

  private onListVisible = (): void => {
    this.props.eva.dispatch([Interaction.ACTIVE]);
    this.createExpandAnimation(-CHEVRON_DEG_COLLAPSED).start(() => {
      this.props.onFocus && this.props.onFocus(null);
    });
  };

  private onListInvisible = (): void => {
    this.props.eva.dispatch([]);
    this.createExpandAnimation(CHEVRON_DEG_EXPANDED).start(() => {
      this.props.onBlur && this.props.onBlur(null);
    });
  };

  private getComponentStyle = (style: StyleType) => {
    const {
      textMarginHorizontal,
      textFontFamily,
      textFontSize,
      textLineHeight,
      textFontWeight,
      textColor,
      placeholderColor,
      iconWidth,
      iconHeight,
      iconMarginHorizontal,
      iconTintColor,
      labelColor,
      labelFontSize,
      labelLineHeight,
      labelMarginBottom,
      labelFontWeight,
      captionMarginTop,
      captionColor,
      captionFontSize,
      captionLineHeight,
      captionFontWeight,
      captionIconWidth,
      captionIconHeight,
      captionIconMarginRight,
      captionIconTintColor,
      popoverMaxHeight,
      popoverBorderRadius,
      popoverBorderColor,
      popoverBorderWidth,
      ...inputParameters
    } = style;

    return {
      input: inputParameters,
      text: {
        marginHorizontal: textMarginHorizontal,
        fontFamily: textFontFamily,
        fontSize: textFontSize,
        fontWeight: textFontWeight,
        lineHeight: textLineHeight,
        color: textColor,
      },
      placeholder: {
        marginHorizontal: textMarginHorizontal,
        color: placeholderColor,
      },
      icon: {
        width: iconWidth,
        height: iconHeight,
        marginHorizontal: iconMarginHorizontal,
        tintColor: iconTintColor,
      },
      label: {
        marginBottom: labelMarginBottom,
        fontSize: labelFontSize,
        lineHeight: labelLineHeight,
        fontWeight: labelFontWeight,
        color: labelColor,
      },
      caption: {
        marginTop: captionMarginTop,
        fontSize: captionFontSize,
        fontWeight: captionFontWeight,
        lineHeight: captionLineHeight,
        color: captionColor,
      },
      popover: {
        maxHeight: popoverMaxHeight,
        borderRadius: popoverBorderRadius,
        borderWidth: popoverBorderWidth,
        borderColor: popoverBorderColor,
      },
    };
  };

  private setOptionsListVisible = (): void => {
    const hasData: boolean = this.data.length > 0;
    hasData && this.setState({ listVisible: true }, this.onListVisible);
  };

  private setOptionsListInvisible = (): void => {
    this.setState({ listVisible: false }, this.onListInvisible);
  };

  private createExpandAnimation = (toValue: number): Animated.CompositeAnimation => {
    return Animated.timing(this.expandAnimation, {
      toValue,
      duration: CHEVRON_ANIM_DURATION,
      useNativeDriver: Platform.OS !== 'web',
    });
  };

  private cloneItemWithProps = (el: SelectItemElement, props: SelectItemProps): SelectItemElement => {
    const nestedElements = React.Children.map(el.props.children, (nestedEl: SelectItemElement, index: number) => {
      const descriptor = this.service.createDescriptorForNestedElement(nestedEl, props.descriptor, index);
      const selected: boolean = this.service.isSelected(descriptor, this.selectedIndices);

      return this.cloneItemWithProps(nestedEl, { ...props, descriptor, selected, disabled: false });
    });

    return React.cloneElement(el, { ...props, ...el.props }, nestedElements);
  };

  private renderItem = (info: ListRenderItemInfo<SelectItemElement>): SelectItemElement => {
    const descriptor = this.service.createDescriptorForElement(info.item, this.isMultiSelect, info.index);
    const selected: boolean = this.service.isSelected(descriptor, this.selectedIndices);
    const disabled: boolean = this.service.isDisabled(descriptor);

    return this.cloneItemWithProps(info.item, { descriptor, selected, disabled, onPress: this.onItemPress });
  };

  private renderDefaultIconElement = (evaStyle): React.ReactElement => {
    return (
      <Animated.View style={{ transform: [{ rotate: this.expandToRotateInterpolation }] }}>
        <ChevronDown {...evaStyle} fill={evaStyle.tintColor}/>
      </Animated.View>
    );
  };

  private renderInputElement = (props: SelectProps, evaStyle): TouchableWebElement => {
    const value: string = props.value || this.service.toStringSelected(this.selectedIndices);
    const textStyle: TextStyle = value && evaStyle.text;

    return (
      <TouchableWeb
        style={[styles.input, evaStyle.input]}
        onPress={this.onPress}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onPressIn={this.onPressIn}
        onPressOut={this.onPressOut}>
        <FalsyFC
          style={evaStyle.icon}
          component={props.accessoryLeft}
        />
        <FalsyText
          style={[styles.text, evaStyle.placeholder, textStyle]}
          numberOfLines={1}
          ellipsizeMode='tail'
          component={value || this.props.placeholder}
        />
        <FalsyFC
          style={evaStyle.icon}
          component={props.accessoryRight}
          fallback={this.renderDefaultIconElement(evaStyle.icon)}
        />
      </TouchableWeb>
    );
  };

  public render(): React.ReactElement<ViewProps> {
    const { eva, style, label, caption, children, ...touchableProps } = this.props;
    const evaStyle = this.getComponentStyle(eva.style);

    return (
      <View style={[styles.container, style]}>
        <FalsyText
          style={[styles.label, evaStyle.label]}
          component={label}
        />
        <Popover
          ref={this.popoverRef}
          style={[styles.popover, evaStyle.popover]}
          visible={this.state.listVisible}
          fullWidth={true}
          anchor={() => this.renderInputElement(touchableProps, evaStyle)}
          onBackdropPress={this.onBackdropPress}>
          <List
            style={styles.list}
            data={this.data}
            bounces={false}
            renderItem={this.renderItem}
          />
        </Popover>
        <FalsyText
          style={[styles.caption, evaStyle.caption]}
          component={caption}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'red',
  },
  popover: {
    overflow: 'hidden',
  },
  list: {
    flexGrow: 0,
  },
  text: {
    flex: 1,
    textAlign: 'left',
  },
  label: {
    textAlign: 'left',
  },
  caption: {
    textAlign: 'left',
  },
});

export const Select = styled<SelectProps>(SelectComponent);