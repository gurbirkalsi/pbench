import React from 'react';
import { shallow, mount } from 'enzyme';
import { Input } from 'antd';
import SearchBar from './index';

const { Search } = Input;

const mockProps = {
  onSearch: jest.fn(),
  style: {
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
    maxWidth: 300,
  },
};

const mockDispatch = jest.fn();
const wrapper = shallow(<SearchBar dispatch={mockDispatch} {...mockProps} />);
const mountedWrapper = mount(<SearchBar dispatch={mockDispatch} {...mockProps} />);

describe('test rendering of TableFilterSelection page component', () => {
  it('render with empty props', () => {
    expect(wrapper).toMatchSnapshot();
  });
  it('checks rendering', () => {
    expect(wrapper.find(Search).length).toEqual(1);
  });
});

describe('test interaction of SearchBar page component', () => {
  it('render with empty props', () => {
    expect(mountedWrapper.find(Search)).toHaveLength(1);
    expect(mountedWrapper.instance().searchBar).toBeTruthy();
  });
  it('changes search value', () => {
    wrapper
      .find(Search)
      .at(0)
      .simulate('change', { target: { value: 'mockValue' } });
    expect(wrapper.state('searchValue')).toEqual('mockValue');
  });
  it('on search value', () => {
    const onSearch = jest.fn();
    wrapper.setProps({ onSearch });
    wrapper
      .find(Search)
      .first()
      .props()
      .onSearch();
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
  it('renders Icon if search value is not empty', () => {
    wrapper.setState({ searchValue: 'abc' });
    expect(wrapper.find(Search).props().suffix.props).not.toBe({});
  });
  it('should clear user inputted search value', () => {
    mountedWrapper.setState({ searchValue: 'test ' });
    expect(
      mountedWrapper
        .find('Icon')
        .at(1)
        .prop('type')
    ).toEqual('close-circle');
    const icon = mountedWrapper.find('Icon').at(1);
    icon.simulate('click');
  });
});
