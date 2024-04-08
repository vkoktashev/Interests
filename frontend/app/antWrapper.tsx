"use client";
import React from "react";
import { ConfigProvider, theme } from "antd";
import {AntdRegistry} from '@ant-design/nextjs-registry';

export default function AntWrapper(props: any) {
    return (
        <AntdRegistry>
            <ConfigProvider
                theme={{
                    cssVar: true,
                    algorithm: theme.darkAlgorithm,
                    components: {
                        Segmented: {
                            itemSelectedBg: theme.useToken().token.colorPrimary,
                        },
                    },
                }}
            >
                {props.children}
            </ConfigProvider>
        </AntdRegistry>
    );
}
